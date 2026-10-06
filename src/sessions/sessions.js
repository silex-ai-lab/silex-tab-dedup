import { exportHtml, exportJson, tabCount } from '../core/sessions.js';
import { downloadText, today } from '../shared/download.js';
import { faviconUrl, localizePage, t } from '../shared/store.js';

const $ = (id) => document.getElementById(id);
let sessions = [];

async function send(type, extra = {}) {
  const res = await chrome.runtime.sendMessage({ type, ...extra });
  if (!res?.ok) throw new Error(res?.error ?? 'no response');
  return res.result;
}

function status(text) {
  $('status').textContent = text;
}

function clone(id) {
  const node = /** @type {HTMLTemplateElement} */ ($(id)).content.firstElementChild.cloneNode(true);
  localizePage(/** @type {Element} */ (node));
  return /** @type {HTMLElement} */ (node);
}

function render() {
  $('none').hidden = sessions.length !== 0;
  for (const id of ['exportHtml', 'exportJson']) /** @type {HTMLButtonElement} */ ($(id)).disabled = sessions.length === 0;
  const list = $('list');
  list.replaceChildren();
  for (const s of sessions) {
    const card = clone('sessionTpl');
    const name = /** @type {HTMLInputElement} */ (card.querySelector('.name'));
    name.value = s.name;
    name.addEventListener('change', () => send('renameSession', { id: s.id, name: name.value }));
    name.addEventListener('keydown', (e) => e.key === 'Enter' && name.blur());
    const date = new Date(s.createdAt).toLocaleString(chrome.i18n.getUILanguage(), { dateStyle: 'medium', timeStyle: 'short' });
    card.querySelector('.meta').textContent = `${t('tabsInGroup', [String(tabCount(s))])} · ${date}`;
    card.querySelector('.restore').addEventListener('click', async () => {
      const r = await send('restoreSession', { id: s.id });
      status(t('restored', [String(r.opened), String(r.skipped)]));
    });
    card.querySelector('.delete').addEventListener('click', async () => {
      await send('deleteSession', { id: s.id });
      await load();
      status(t('deleted', [s.name]));
    });
    const windows = card.querySelector('.windows');
    s.windows.forEach((w, wi) => {
      const box = clone('windowTpl');
      const h3 = box.querySelector('h3');
      if (s.windows.length > 1) h3.textContent = t('windowN', [String(wi + 1)]);
      else h3.remove();
      const ul = box.querySelector('ul');
      w.tabs.forEach((tab, ti) => {
        const li = clone('tabTpl');
        /** @type {HTMLImageElement} */ (li.querySelector('.favicon')).src = faviconUrl(tab.url);
        const a = /** @type {HTMLAnchorElement} */ (li.querySelector('.title'));
        a.textContent = tab.title || tab.url;
        a.href = tab.url;
        a.title = tab.url;
        // Open through the service worker so an already-open page is focused instead.
        a.addEventListener('click', (e) => {
          e.preventDefault();
          send('restoreSession', { id: s.id, url: tab.url });
        });
        /** @type {HTMLElement} */ (li.querySelector('.pin')).hidden = !tab.pinned;
        li.querySelector('.remove').addEventListener('click', async () => {
          await send('removeSessionTab', { id: s.id, window: wi, tab: ti });
          await load();
        });
        ul.append(li);
      });
      windows.append(box);
    });
    list.append(card);
  }
}

async function load() {
  sessions = await send('listSessions');
  render();
}

localizePage();

$('saveAll').addEventListener('click', async () => {
  const s = await send('saveSession', { scope: 'all' });
  await load();
  if (s) status(t('savedSession', [s.name]));
});
$('exportJson').addEventListener('click', () =>
  downloadText(exportJson(sessions), `tab-dedup-sessions-${today()}.json`, 'application/json'),
);
$('exportHtml').addEventListener('click', () =>
  downloadText(exportHtml(sessions), `tab-dedup-sessions-${today()}.html`, 'text/html'),
);
$('importFile').addEventListener('change', async (e) => {
  const input = /** @type {HTMLInputElement} */ (e.target);
  const file = input.files?.[0];
  if (!file) return;
  const n = await send('importSessions', { text: await file.text(), name: file.name.replace(/\.[^.]+$/, '') });
  input.value = '';
  await load();
  status(n ? t('imported', [String(n)]) : t('importNothing'));
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.sessions && !document.activeElement?.classList.contains('name')) load();
});

load();
