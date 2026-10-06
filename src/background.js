// Service worker: watches navigations, closes or flags duplicate tabs, keeps the
// badge current, and holds the undo stack. MV3 workers sleep at any time, so all
// state lives in chrome.storage.session and every decision re-reads open tabs.

import { normalizeUrl } from './core/normalize.js';
import {
  countDuplicates,
  findDuplicateGroups,
  makeKeyFn,
  pickKeeper,
  tabsToClose,
} from './core/groups.js';
import { loadSettings, t } from './shared/store.js';

const UNDO_LIMIT = 20;
const STARTUP_GRACE_MS = 10_000;
const PENDING_EXEMPT_MS = 15_000;
const GO_BACK_LOOP_MS = 5_000;
const ICON = chrome.runtime.getURL('icons/icon-128.png');

// Navigations that the user did not ask for just now. Chrome reports reloads, discarded
// tabs waking up, session restore, Ctrl+Shift+T and the "Duplicate tab" command all as
// 'reload', so deliberate duplicates are left alone without any extra bookkeeping.
const SKIP_TRANSITIONS = new Set(['reload', 'auto_subframe', 'manual_subframe']);

// ---------------------------------------------------------------------------
// Serialised work queue. Chrome delivers events concurrently; running them one
// at a time keeps read-modify-write of session state and tab closes consistent.

let queue = Promise.resolve();

/** @template T @param {() => Promise<T>} fn @returns {Promise<T>} */
function enqueue(fn) {
  const run = queue.then(fn);
  queue = run.catch((err) => console.error('[tab-dedup]', err));
  return run;
}

// ---------------------------------------------------------------------------
// Session state (cleared when the browser restarts).

/**
 * @typedef {object} ClosedTab
 * @property {string} url
 * @property {string} [title]
 * @property {number} windowId
 * @property {number} index
 * @property {boolean} [incognito]
 * @property {boolean} [pinned]
 *
 * @typedef {{ id: string, at: number, kind: 'closed', tabs: ClosedTab[] }
 *         | { id: string, at: number, kind: 'back', tabId: number, url: string, title?: string, incognito?: boolean }} UndoEntry
 *
 * @typedef {object} SessionState
 * @property {Record<string, { url: string, prev?: string }>} navs  last two committed top-level URLs per tab id
 * @property {Record<string, string>} exempt        tab id -> key it may stay a duplicate at
 * @property {{ key: string, until: number }[]} pending  keys exempted for a short while (undo, restore)
 * @property {Record<string, number>} wentBack      tab id -> time we last sent it back
 * @property {Record<string, { dupId: number, keepId: number }>} asks  open "ask" notifications
 * @property {UndoEntry[]} undo
 * @property {number} startedAt
 */

/** @returns {Promise<SessionState>} */
async function loadState() {
  const s = await chrome.storage.session.get(null);
  return {
    navs: s.navs ?? {},
    exempt: s.exempt ?? {},
    pending: (s.pending ?? []).filter((p) => p.until > Date.now()),
    wentBack: s.wentBack ?? {},
    asks: s.asks ?? {},
    undo: s.undo ?? [],
    startedAt: s.startedAt ?? 0,
  };
}

/** @param {Partial<SessionState>} patch */
function saveState(patch) {
  return chrome.storage.session.set(patch);
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** @param {chrome.tabs.Tab} tab @returns {ClosedTab} */
function snapshot(tab) {
  return {
    url: tab.url || tab.pendingUrl || '',
    title: tab.title,
    windowId: tab.windowId,
    index: tab.index,
    incognito: tab.incognito,
    pinned: tab.pinned,
  };
}

/** @param {SessionState} state @param {UndoEntry} entry */
async function pushUndo(state, entry) {
  state.undo = [entry, ...state.undo].slice(0, UNDO_LIMIT);
  await saveState({ undo: state.undo });
}

// ---------------------------------------------------------------------------
// Badge

let badgeTimer = 0;

function scheduleBadge() {
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => enqueue(updateBadge), 150);
}

async function updateBadge() {
  const settings = await loadSettings();
  const tabs = await chrome.tabs.query({});
  const count = countDuplicates(findDuplicateGroups(tabs, settings));
  await chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
  await chrome.action.setBadgeText({ text: settings.showBadge && count ? String(count) : '' });
  await chrome.action.setTitle({
    title: count ? t('badgeTitleSome', [String(count)]) : t('badgeTitleNone'),
  });
}

// ---------------------------------------------------------------------------
// Acting on one navigation

/**
 * @param {chrome.webNavigation.WebNavigationTransitionCallbackDetails & { documentLifecycle?: string }} details
 */
async function handleCommit(details) {
  const state = await loadState();
  const prev = state.navs[details.tabId]?.url;
  state.navs[details.tabId] = { url: details.url, prev };
  await saveState({ navs: state.navs });

  const settings = await loadSettings();
  if (settings.mode === 'off') return;
  if (SKIP_TRANSITIONS.has(details.transitionType)) return;
  if (details.transitionQualifiers.includes('forward_back')) return;
  if (state.startedAt && Date.now() - state.startedAt < STARTUP_GRACE_MS) return;

  const tab = await chrome.tabs.get(details.tabId).catch(() => null);
  if (!tab) return;
  const current = { ...tab, url: details.url };
  const keyOf = makeKeyFn(settings);
  const key = keyOf(current);
  if (key === null) return;

  // Tabs the user chose to keep stay exempt until they navigate somewhere else.
  const id = String(tab.id);
  if (state.exempt[id] === key) return;
  if (state.exempt[id]) delete state.exempt[id];
  if (state.pending.some((p) => p.key === key)) {
    state.exempt[id] = key;
    await saveState({ exempt: state.exempt });
    return;
  }
  await saveState({ exempt: state.exempt });

  // Tabs still loading are judged by their own commit, so two tabs opened at once
  // resolve the same way as two opened one after the other.
  const others = (await chrome.tabs.query({})).filter(
    (o) => o.id !== tab.id && !o.pendingUrl && keyOf(o) === key,
  );
  if (!others.length) return;

  if (settings.protectPinned && tab.pinned) return;

  if (settings.mode === 'ask') {
    const existing = pickKeeper(others, settings);
    await ask(state, tab, existing);
    return;
  }

  // Only this navigation is acted on: either the navigated tab goes, or (when it is
  // the one to keep, e.g. keep = 'newer') the tabs it duplicates go. Unrelated
  // duplicates elsewhere are left for the popup and the shortcut.
  const all = [current, ...others];
  const keeper = pickKeeper(all, settings);
  /** @type {UndoEntry} */
  let entry;
  if (keeper.id === tab.id) {
    const victims = tabsToClose(all, keeper, settings);
    if (!victims.length) return;
    entry = { id: newId(), at: Date.now(), kind: 'closed', tabs: victims.map(snapshot) };
    await chrome.tabs.remove(victims.map((v) => v.id));
    await pushUndo(state, entry);
  } else {
    // Focus first, so Chrome does not briefly activate a neighbouring tab.
    if (tab.active) await focusTab(keeper);
    entry = await dispose(state, current, prev, details);
  }
  if (settings.notifyOnClose) await notifyClosed(entry, current);
}

/**
 * Gets rid of the duplicate tab that was just navigated. A tab that already had
 * its own page is sent back to it, so the user's history in that tab survives;
 * a fresh tab is closed.
 * @returns {Promise<UndoEntry>}
 */
async function dispose(state, tab, prev, details) {
  const id = String(tab.id);
  const recentlyBack = Date.now() - (state.wentBack[id] ?? 0) < GO_BACK_LOOP_MS;
  const canGoBack =
    prev &&
    prev !== tab.url &&
    normalizeUrl(prev) !== null &&
    !recentlyBack &&
    !details?.transitionQualifiers?.includes('client_redirect');

  if (canGoBack) {
    state.wentBack[id] = Date.now();
    await saveState({ wentBack: state.wentBack });
    await goBack(tab.id, tab.url, prev);
    /** @type {UndoEntry} */
    const entry = { id: newId(), at: Date.now(), kind: 'back', tabId: tab.id, url: tab.url, title: tab.title, incognito: tab.incognito };
    await pushUndo(state, entry);
    return entry;
  }

  /** @type {UndoEntry} */
  const entry = { id: newId(), at: Date.now(), kind: 'closed', tabs: [snapshot(tab)] };
  await chrome.tabs.remove(tab.id);
  await pushUndo(state, entry);
  return entry;
}

/**
 * Right as a navigation commits, Chrome sometimes rejects goBack ("Cannot find a next
 * page in history") or accepts it and does nothing. Check that the tab actually left
 * the duplicate page, and otherwise load the previous page directly.
 */
async function goBack(tabId, dupUrl, prevUrl) {
  await chrome.tabs.goBack(tabId).catch(() => {});
  for (let waited = 0; waited < 1500; waited += 100) {
    await new Promise((r) => setTimeout(r, 100));
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) return;
    if ((tab.pendingUrl || tab.url) !== dupUrl) return;
  }
  await chrome.tabs.update(tabId, { url: prevUrl });
}

/** Brings a tab to the front, including its window. */
async function focusTab(tab) {
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Notifications: "ask" mode and the optional undo toast

async function ask(state, dup, existing) {
  const notifId = `ask:${newId()}`;
  state.asks[notifId] = { dupId: dup.id, keepId: existing.id };
  await saveState({ asks: state.asks });
  await chrome.notifications.create(notifId, {
    type: 'basic',
    iconUrl: ICON,
    title: t('askTitle'),
    message: dup.title && dup.title !== dup.url ? `${dup.title}\n${dup.url}` : dup.url,
    buttons: [{ title: t('askSwitch') }, { title: t('askKeep') }],
    requireInteraction: true,
  });
}

async function notifyClosed(entry, tab) {
  await chrome.notifications.create(`undo:${entry.id}`, {
    type: 'basic',
    iconUrl: ICON,
    title: t('closedTitle'),
    message: tab.title || tab.url,
    buttons: [{ title: t('undo') }],
  });
}

async function onNotificationButton(notifId, button) {
  chrome.notifications.clear(notifId);
  const state = await loadState();
  if (notifId.startsWith('undo:')) {
    await undo(state, notifId.slice(5));
    return;
  }
  const askEntry = state.asks[notifId];
  if (!askEntry) return;
  delete state.asks[notifId];
  await saveState({ asks: state.asks });
  const [dup, existing] = await Promise.all([
    chrome.tabs.get(askEntry.dupId).catch(() => null),
    chrome.tabs.get(askEntry.keepId).catch(() => null),
  ]);
  if (!dup) return;
  const settings = await loadSettings();
  const key = makeKeyFn(settings)(dup);
  if (button === 0) {
    if (!existing || key === null || makeKeyFn(settings)(existing) !== key) return;
    const nav = state.navs[String(dup.id)];
    await focusTab(existing);
    await dispose(state, dup, nav?.url === dup.url ? nav.prev : undefined, null);
  } else if (key !== null) {
    state.exempt[String(dup.id)] = key;
    await saveState({ exempt: state.exempt });
  }
}

// ---------------------------------------------------------------------------
// Manual actions (popup, keyboard shortcut)

/** Closes every duplicate, keeping one tab per group. Returns the number closed. */
async function closeAllDuplicates() {
  const settings = await loadSettings();
  const tabs = await chrome.tabs.query({});
  const focused = await chrome.windows.getLastFocused().catch(() => null);
  const ctx = { preferActive: true, focusedWindowId: focused?.id };
  const victims = findDuplicateGroups(tabs, settings).flatMap((g) =>
    tabsToClose(g.tabs, pickKeeper(g.tabs, settings, ctx), settings),
  );
  if (!victims.length) return 0;
  const state = await loadState();
  await chrome.tabs.remove(victims.map((v) => v.id));
  await pushUndo(state, { id: newId(), at: Date.now(), kind: 'closed', tabs: victims.map(snapshot) });
  return victims.length;
}

async function closeOne(tabId) {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab) return;
  const state = await loadState();
  await chrome.tabs.remove(tabId);
  await pushUndo(state, { id: newId(), at: Date.now(), kind: 'closed', tabs: [snapshot(tab)] });
}

/** Reopens what an undo entry closed (or sends a tab forward again) and exempts it. */
async function undo(state, entryId) {
  const entry = state.undo.find((e) => e.id === entryId);
  if (!entry) return false;
  state.undo = state.undo.filter((e) => e.id !== entryId);
  const settings = await loadSettings();
  const keyOf = makeKeyFn(settings);
  const until = Date.now() + PENDING_EXEMPT_MS;

  if (entry.kind === 'back') {
    const key = keyOf({ id: entry.tabId, windowId: -1, url: entry.url, incognito: entry.incognito });
    if (key) state.pending.push({ key, until });
    await saveState({ undo: state.undo, pending: state.pending });
    const tab = await chrome.tabs.get(entry.tabId).catch(() => null);
    if (tab) {
      if (key) state.exempt[String(tab.id)] = key;
      await saveState({ exempt: state.exempt });
      await chrome.tabs.goForward(tab.id).catch(() => chrome.tabs.update(tab.id, { url: entry.url }));
      await focusTab(tab);
    } else {
      await chrome.tabs.create({ url: entry.url });
    }
    return true;
  }

  const keys = entry.tabs.map((c) => keyOf({ id: -1, windowId: c.windowId, url: c.url, incognito: c.incognito }));
  for (const key of keys) if (key) state.pending.push({ key, until });
  await saveState({ undo: state.undo, pending: state.pending });

  const recent = await chrome.sessions.getRecentlyClosed({ maxResults: 25 }).catch(() => []);
  const used = new Set();
  for (const [i, closed] of entry.tabs.entries()) {
    const match = recent.find((s) => s.tab && s.tab.url === closed.url && !used.has(s.tab.sessionId));
    let restored = null;
    if (match?.tab?.sessionId) {
      used.add(match.tab.sessionId);
      restored = await chrome.sessions.restore(match.tab.sessionId).catch(() => null);
    }
    let tabId = restored?.tab?.id;
    if (!restored) {
      const win = await chrome.windows.get(closed.windowId).catch(() => null);
      const created = await chrome.tabs.create({
        url: closed.url,
        windowId: win ? closed.windowId : undefined,
        index: win ? closed.index : undefined,
        pinned: closed.pinned,
      });
      tabId = created.id;
    }
    if (tabId !== undefined && keys[i]) state.exempt[String(tabId)] = keys[i];
  }
  await saveState({ exempt: state.exempt });
  return true;
}

/** Everything the popup renders, computed in one place. */
async function getPopupState() {
  const settings = await loadSettings();
  const tabs = await chrome.tabs.query({});
  const state = await loadState();
  const exempt = new Set(Object.keys(state.exempt));
  const groups = findDuplicateGroups(tabs, settings).map((g) => ({
    key: g.key,
    tabs: g.tabs.map((tab) => ({
      id: tab.id,
      windowId: tab.windowId,
      title: tab.title,
      url: tab.url || tab.pendingUrl,
      favIconUrl: tab.favIconUrl,
      pinned: tab.pinned,
      active: tab.active,
      kept: exempt.has(String(tab.id)),
    })),
  }));
  return {
    settings,
    groups,
    count: countDuplicates(groups),
    windowCount: new Set(tabs.map((tab) => tab.windowId)).size,
    undo: state.undo,
  };
}

// ---------------------------------------------------------------------------
// Event wiring. Listeners are registered synchronously at top level, as MV3 requires.

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0 || details.tabId < 0) return;
  // Prerendered and back/forward-cached documents are not something the user opened.
  if (details.documentLifecycle && details.documentLifecycle !== 'active') return;
  enqueue(() => handleCommit(details)).finally(scheduleBadge);
});

chrome.tabs.onCreated.addListener(scheduleBadge);

chrome.tabs.onRemoved.addListener((tabId) => {
  enqueue(async () => {
    const state = await loadState();
    const id = String(tabId);
    delete state.navs[id];
    delete state.exempt[id];
    delete state.wentBack[id];
    await saveState({ navs: state.navs, exempt: state.exempt, wentBack: state.wentBack });
  });
  scheduleBadge();
});

chrome.tabs.onUpdated.addListener((_tabId, change) => {
  if (change.url || change.pinned !== undefined || change.status === 'complete') scheduleBadge();
});
chrome.tabs.onAttached.addListener(scheduleBadge);
chrome.tabs.onDetached.addListener(scheduleBadge);
chrome.tabs.onReplaced.addListener(scheduleBadge);

chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'sync') scheduleBadge();
});

chrome.runtime.onStartup.addListener(() => {
  enqueue(() => saveState({ startedAt: Date.now() }));
  scheduleBadge();
});
chrome.runtime.onInstalled.addListener(scheduleBadge);

chrome.notifications.onButtonClicked.addListener((notifId, button) => {
  enqueue(() => onNotificationButton(notifId, button)).finally(scheduleBadge);
});
chrome.notifications.onClosed.addListener((notifId) => {
  if (!notifId.startsWith('ask:')) return;
  enqueue(async () => {
    const state = await loadState();
    delete state.asks[notifId];
    await saveState({ asks: state.asks });
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'close-duplicates') enqueue(closeAllDuplicates).finally(scheduleBadge);
});

/** @type {Record<string, (msg: any) => Promise<unknown>>} */
const handlers = {
  getState: () => getPopupState(),
  closeAll: () => closeAllDuplicates(),
  closeTab: (msg) => closeOne(msg.tabId),
  focusTab: async (msg) => {
    const tab = await chrome.tabs.get(msg.tabId).catch(() => null);
    if (tab) await focusTab(tab);
  },
  undo: async (msg) => undo(await loadState(), msg.id),
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  const handler = handlers[msg?.type];
  if (!handler) return false;
  enqueue(() => handler(msg))
    .then((result) => sendResponse({ ok: true, result }), (err) => sendResponse({ ok: false, error: String(err) }))
    .finally(scheduleBadge);
  return true;
});

scheduleBadge();
