import { localizePage, saveSettings, t } from '../shared/store.js';

const $ = (id) => document.getElementById(id);

async function send(type, extra = {}) {
  const res = await chrome.runtime.sendMessage({ type, ...extra });
  if (!res?.ok) throw new Error(res?.error ?? 'no response');
  return res.result;
}

function hostOf(url) {
  try {
    const u = new URL(url);
    return u.host || u.protocol;
  } catch {
    return url;
  }
}

function timeAgo(ms) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return t('agoSeconds', [String(Math.max(s, 1))]);
  const m = Math.round(s / 60);
  if (m < 60) return t('agoMinutes', [String(m)]);
  return t('agoHours', [String(Math.round(m / 60))]);
}

function clone(id) {
  const node = /** @type {HTMLTemplateElement} */ ($(id)).content.firstElementChild.cloneNode(true);
  localizePage(/** @type {Element} */ (node));
  return /** @type {HTMLElement} */ (node);
}

function renderMode(mode) {
  for (const b of $('mode').querySelectorAll('button')) {
    b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  }
}

function renderGroups(state) {
  const windowNumbers = new Map();
  for (const g of state.groups) for (const tab of g.tabs) {
    if (!windowNumbers.has(tab.windowId)) windowNumbers.set(tab.windowId, windowNumbers.size + 1);
  }
  const list = $('groups');
  list.replaceChildren();
  for (const g of state.groups) {
    const item = clone('groupTpl');
    item.querySelector('.host').textContent = hostOf(g.tabs[0].url);
    item.querySelector('.n').textContent = t('tabsInGroup', [String(g.tabs.length)]);
    const tabs = item.querySelector('.tabs');
    for (const tab of g.tabs) {
      const row = clone('tabTpl');
      const icon = /** @type {HTMLImageElement} */ (row.querySelector('.favicon'));
      if (tab.favIconUrl && /^(https?|data):/.test(tab.favIconUrl)) icon.src = tab.favIconUrl;
      else icon.src = '../../icons/icon-16.png';
      icon.onerror = () => (icon.src = '../../icons/icon-16.png');
      row.querySelector('.title').textContent = tab.title || tab.url;
      const meta = [tab.url];
      if (state.windowCount > 1) meta.unshift(t('windowN', [String(windowNumbers.get(tab.windowId))]));
      if (tab.pinned) meta.unshift(t('pinned'));
      if (tab.active) meta.unshift(t('active'));
      if (tab.kept) meta.unshift(t('kept'));
      row.querySelector('.meta').textContent = meta.join(' · ');
      row.querySelector('.tab-main').title = tab.url;
      row.querySelector('.tab-main').addEventListener('click', async () => {
        await send('focusTab', { tabId: tab.id });
        window.close();
      });
      row.querySelector('.close').addEventListener('click', async () => {
        await send('closeTab', { tabId: tab.id });
        refresh();
      });
      tabs.append(row);
    }
    list.append(item);
  }
}

function renderUndo(entries) {
  $('undoSection').hidden = entries.length === 0;
  const list = $('undoList');
  list.replaceChildren();
  for (const entry of entries.slice(0, 5)) {
    const row = clone('undoTpl');
    const first = entry.kind === 'back' ? entry : entry.tabs[0];
    const extra = entry.kind === 'closed' && entry.tabs.length > 1 ? ` ${t('andMore', [String(entry.tabs.length - 1)])}` : '';
    row.querySelector('.title').textContent = (first.title || first.url) + extra;
    row.querySelector('.meta').textContent =
      (entry.kind === 'back' ? t('sentBack') : t('closedLabel')) + ' · ' + timeAgo(entry.at);
    row.querySelector('.undo-btn').addEventListener('click', async () => {
      await send('undo', { id: entry.id });
      refresh();
    });
    list.append(row);
  }
}

async function refresh() {
  const state = await send('getState');
  renderMode(state.settings.mode);
  const count = $('count');
  count.hidden = state.count === 0;
  count.textContent = String(state.count);
  $('empty').hidden = state.count !== 0;
  $('dupes').hidden = state.count === 0;
  $('closeAll').textContent = t('closeAllN', [String(state.count)]);
  renderGroups(state);
  renderUndo(state.undo);
}

async function showShortcut() {
  const commands = await chrome.commands.getAll();
  const cmd = commands.find((c) => c.name === 'close-duplicates');
  $('shortcut').textContent = cmd?.shortcut ? t('shortcutHint', [cmd.shortcut]) : '';
}

localizePage();
$('options').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('closeAll').addEventListener('click', async () => {
  await send('closeAll');
  refresh();
});
for (const b of $('mode').querySelectorAll('button')) {
  b.addEventListener('click', async () => {
    renderMode(b.dataset.mode);
    await saveSettings({ mode: /** @type {any} */ (b.dataset.mode) });
  });
}
showShortcut();
refresh();
