import { groupByHost, searchTabs } from '../core/search.js';
import { tabCount } from '../core/sessions.js';
import { faviconUrl, localizePage, saveSettings, t } from '../shared/store.js';

const tabsLabel = (n) => (n === 1 ? t('tabsInGroupOne') : t('tabsInGroup', [String(n)]));
const $ = (id) => document.getElementById(id);
const VIEW_KEY = 'tab-dedup:view';

/** Latest state from the service worker. */
let state = null;
let sessions = [];
let view = readView();
let selected = 0;

function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) || 'dupes';
  } catch {
    return 'dupes';
  }
}

function writeView(v) {
  try {
    localStorage.setItem(VIEW_KEY, v);
  } catch {
    // Storage can be unavailable; the popup simply opens on the default view.
  }
}

async function send(type, extra = {}) {
  const res = await chrome.runtime.sendMessage({ type, ...extra });
  if (!res?.ok) throw new Error(res?.error ?? 'no response');
  return res.result;
}

function timeAgo(ms) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return t('agoSeconds', [String(Math.max(s, 1))]);
  const m = Math.round(s / 60);
  if (m < 60) return t('agoMinutes', [String(m)]);
  const h = Math.round(m / 60);
  if (h < 48) return t('agoHours', [String(h)]);
  return new Date(ms).toLocaleDateString(chrome.i18n.getUILanguage());
}

function hostOf(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') || u.protocol;
  } catch {
    return url;
  }
}

function clone(id) {
  const node = /** @type {HTMLTemplateElement} */ ($(id)).content.firstElementChild.cloneNode(true);
  localizePage(/** @type {Element} */ (node));
  return /** @type {HTMLElement} */ (node);
}

/**
 * One tab row: click to switch to it, × to close it.
 * @param {{ id: number, title?: string, url: string, windowId: number, pinned?: boolean, active?: boolean, kept?: boolean }} tab
 */
function tabRow(tab, { showUrl = true } = {}) {
  const row = clone('tabTpl');
  /** @type {HTMLImageElement} */ (row.querySelector('.favicon')).src = faviconUrl(tab.url);
  row.querySelector('.title').textContent = tab.title || tab.url;
  const meta = [];
  if (tab.kept) meta.push(t('kept'));
  if (tab.active) meta.push(t('active'));
  if (tab.pinned) meta.push(t('pinned'));
  if (windowCount() > 1) meta.push(t('windowN', [String(windowNumber(tab.windowId))]));
  if (showUrl) meta.push(tab.url);
  row.querySelector('.meta').textContent = meta.join(' · ');
  row.querySelector('.tab-main').setAttribute('title', tab.url);
  row.querySelector('.tab-main').addEventListener('click', () => focusTab(tab.id));
  row.querySelector('.close').addEventListener('click', async () => {
    await send('closeTab', { tabId: tab.id });
    refresh();
  });
  return row;
}

async function focusTab(tabId) {
  await send('focusTab', { tabId });
  window.close();
}

let windowIds = [];
const windowCount = () => windowIds.length;
const windowNumber = (id) => windowIds.indexOf(id) + 1;

// ---------------------------------------------------------------------------
// Views

function showView(v) {
  view = v;
  writeView(v);
  const searching = /** @type {HTMLInputElement} */ ($('search')).value.trim() !== '';
  $('nav').classList.toggle('searching', searching);
  for (const b of $('nav').querySelectorAll('button')) b.setAttribute('aria-selected', String(b.dataset.view === v));
  for (const name of ['dupes', 'all', 'sessions']) $(`view-${name}`).hidden = searching || name !== v;
  $('view-search').hidden = !searching;
}

function renderDupes() {
  for (const b of $('mode').querySelectorAll('button')) {
    b.setAttribute('aria-pressed', String(b.dataset.mode === state.settings.mode));
  }
  $('empty').hidden = state.count !== 0;
  $('dupes').hidden = state.count === 0;
  $('closeAll').textContent = t('closeAllN', [String(state.count)]);
  const list = $('groups');
  list.replaceChildren();
  for (const g of state.groups) {
    const item = clone('groupTpl');
    item.querySelector('.host').textContent = hostOf(g.tabs[0].url);
    item.querySelector('.n').textContent = tabsLabel(g.tabs.length);
    const tabs = item.querySelector('.tabs');
    for (const tab of g.tabs) tabs.append(tabRow(tab));
    list.append(item);
  }

  $('undoSection').hidden = state.undo.length === 0;
  const undoList = $('undoList');
  undoList.replaceChildren();
  for (const entry of state.undo.slice(0, 5)) {
    const row = clone('undoTpl');
    const first = entry.kind === 'back' ? entry : entry.tabs[0];
    const extra = entry.kind === 'closed' && entry.tabs.length > 1 ? ` ${t('andMore', [String(entry.tabs.length - 1)])}` : '';
    row.querySelector('.title').textContent = (first.title || first.url) + extra;
    row.querySelector('.meta').textContent = (entry.kind === 'back' ? t('sentBack') : t('closedLabel')) + ' · ' + timeAgo(entry.at);
    row.querySelector('button').addEventListener('click', async () => {
      await send('undo', { id: entry.id });
      refresh();
    });
    undoList.append(row);
  }
}

function renderAll() {
  const list = $('domains');
  list.replaceChildren();
  for (const g of groupByHost(state.tabs)) {
    const item = clone('groupTpl');
    item.querySelector('.host').textContent = g.host;
    item.querySelector('.n').textContent = tabsLabel(g.tabs.length);
    const closeGroup = /** @type {HTMLButtonElement} */ (item.querySelector('.close-group'));
    closeGroup.hidden = false;
    closeGroup.title = t('closeSite', [String(g.tabs.length)]);
    closeGroup.addEventListener('click', async () => {
      await send('closeTabs', { tabIds: g.tabs.map((tab) => tab.id) });
      refresh();
    });
    const tabs = item.querySelector('.tabs');
    for (const tab of g.tabs) tabs.append(tabRow(tab, { showUrl: false }));
    list.append(item);
  }
}

function renderSessions() {
  $('noSessions').hidden = sessions.length !== 0;
  const list = $('sessions');
  list.replaceChildren();
  for (const s of sessions) {
    const row = clone('sessionTpl');
    row.querySelector('.title').textContent = s.name;
    const n = tabCount(s);
    const parts = [tabsLabel(n)];
    if (s.windows.length > 1) parts.push(t('windowsN', [String(s.windows.length)]));
    parts.push(timeAgo(s.createdAt));
    row.querySelector('.meta').textContent = parts.join(' · ');
    row.querySelector('.restore').addEventListener('click', () => send('restoreSession', { id: s.id }));
    row.querySelector('.close').addEventListener('click', async () => {
      await send('deleteSession', { id: s.id });
      refreshSessions();
    });
    list.append(row);
  }
}

function renderSearch() {
  const query = /** @type {HTMLInputElement} */ ($('search')).value;
  const results = searchTabs(state.tabs, query).slice(0, 50);
  selected = Math.min(selected, Math.max(results.length - 1, 0));
  const list = $('results');
  list.replaceChildren();
  results.forEach((tab, i) => {
    const row = tabRow(tab);
    row.dataset.tabId = String(tab.id);
    row.setAttribute('role', 'option');
    row.classList.toggle('selected', i === selected);
    row.setAttribute('aria-selected', String(i === selected));
    list.append(row);
  });
  $('noResults').hidden = results.length !== 0;
  list.querySelector('.selected')?.scrollIntoView({ block: 'nearest' });
}

function render() {
  windowIds = [...new Set(state.tabs.map((tab) => tab.windowId))];
  const count = $('count');
  count.hidden = state.count === 0;
  count.textContent = String(state.count);
  $('navDupesN').textContent = state.count ? String(state.count) : '';
  $('navAllN').textContent = String(state.tabs.length);
  renderDupes();
  renderAll();
  renderSearch();
  showView(view);
}

async function refresh() {
  state = await send('getState');
  render();
}

async function refreshSessions() {
  sessions = await send('listSessions');
  $('navSessionsN').textContent = sessions.length ? String(sessions.length) : '';
  renderSessions();
}

async function showShortcut() {
  const commands = await chrome.commands.getAll();
  const close = commands.find((c) => c.name === 'close-duplicates')?.shortcut;
  const open = commands.find((c) => c.name === '_execute_action')?.shortcut;
  const hints = [];
  if (open) hints.push(t('shortcutOpen', [open]));
  if (close) hints.push(t('shortcutHint', [close]));
  $('shortcut').textContent = hints.join(' · ');
}

/** @param {'window' | 'all'} scope */
async function save(scope) {
  const win = await chrome.windows.getCurrent();
  await send('saveSession', {
    scope,
    windowId: win.id,
    close: /** @type {HTMLInputElement} */ ($('saveClose')).checked,
  });
  await refreshSessions();
  refresh();
}

// ---------------------------------------------------------------------------
// Wiring

localizePage();
$('options').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('closeAll').addEventListener('click', async () => {
  await send('closeAll');
  refresh();
});
for (const b of $('mode').querySelectorAll('button')) {
  b.addEventListener('click', async () => {
    state.settings.mode = b.dataset.mode;
    renderDupes();
    await saveSettings({ mode: /** @type {any} */ (b.dataset.mode) });
  });
}
for (const b of $('nav').querySelectorAll('button')) b.addEventListener('click', () => showView(b.dataset.view));
$('saveWindow').addEventListener('click', () => save('window'));
$('saveAll').addEventListener('click', () => save('all'));

const search = /** @type {HTMLInputElement} */ ($('search'));
search.addEventListener('input', () => {
  selected = 0;
  renderSearch();
  showView(view);
});
search.addEventListener('keydown', (e) => {
  const rows = $('results').querySelectorAll('.tab');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!rows.length) return;
    selected = (selected + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
    renderSearch();
  } else if (e.key === 'Enter') {
    const row = /** @type {HTMLElement | undefined} */ (rows[selected]);
    if (row) focusTab(Number(row.dataset.tabId));
  } else if (e.key === 'Escape' && search.value) {
    e.preventDefault();
    search.value = '';
    renderSearch();
    showView(view);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.sessions) refreshSessions();
});

showShortcut();
refresh();
refreshSessions();
