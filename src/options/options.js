import { invalidPatterns } from '../core/patterns.js';
import { DEFAULT_SETTINGS, migrateSettings } from '../core/settings.js';
import { downloadText, today } from '../shared/download.js';
import { loadSettings, localizePage, saveSettings, t } from '../shared/store.js';

const $ = (id) => document.getElementById(id);
let savedTimer = 0;
/** Lists edited but not saved yet; a refresh from storage must not overwrite them. */
const dirtyLists = new Set();

function flashSaved() {
  const el = $('saved');
  el.textContent = t('saved');
  el.classList.add('show');
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => el.classList.remove('show'), 1200);
}

async function save(patch) {
  await saveSettings(patch);
  flashSaved();
}

function fill(settings) {
  for (const el of document.querySelectorAll('[data-setting]')) {
    const name = el.getAttribute('data-setting');
    if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = settings[name];
    else /** @type {HTMLSelectElement} */ (el).value = settings[name];
  }
  for (const el of document.querySelectorAll('[data-list]')) {
    const name = el.getAttribute('data-list');
    if (!dirtyLists.has(name)) /** @type {HTMLTextAreaElement} */ (el).value = settings[name].join('\n');
  }
}

function checkPatterns(name, lines) {
  const el = document.querySelector(`[data-error="${name}"]`);
  if (!el) return;
  const bad = invalidPatterns(lines);
  el.hidden = bad.length === 0;
  el.textContent = bad.length ? t('invalidPatterns', [bad.join(', ')]) : '';
}

async function showShortcut() {
  const cmd = (await chrome.commands.getAll()).find((c) => c.name === 'close-duplicates');
  $('shortcut').textContent = cmd?.shortcut || t('notSet');
}

localizePage();
fill(await loadSettings());
showShortcut();

for (const el of document.querySelectorAll('[data-setting]')) {
  el.addEventListener('change', () => {
    const name = el.getAttribute('data-setting');
    const value = el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked : /** @type {HTMLSelectElement} */ (el).value;
    save({ [name]: value });
  });
}

for (const el of document.querySelectorAll('[data-list]')) {
  const name = el.getAttribute('data-list');
  let timer = 0;
  el.addEventListener('input', () => {
    dirtyLists.add(name);
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const lines = /** @type {HTMLTextAreaElement} */ (el).value.split('\n').map((l) => l.trim()).filter(Boolean);
      checkPatterns(name, lines);
      await save({ [name]: lines });
      dirtyLists.delete(name);
    }, 400);
  });
}

$('exportSettings').addEventListener('click', async () => {
  const settings = await loadSettings();
  downloadText(JSON.stringify(settings, null, 2), `tab-dedup-settings-${today()}.json`, 'application/json');
});
$('importSettings').addEventListener('change', async (e) => {
  const input = /** @type {HTMLInputElement} */ (e.target);
  const file = input.files?.[0];
  if (!file) return;
  input.value = '';
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    $('backupStatus').textContent = t('importBadFile');
    return;
  }
  const next = migrateSettings(data);
  await chrome.storage.sync.set({ settings: next });
  dirtyLists.clear();
  fill(next);
  $('backupStatus').textContent = t('importedSettings');
});
$('resetSettings').addEventListener('click', async () => {
  await chrome.storage.sync.set({ settings: migrateSettings(DEFAULT_SETTINGS) });
  dirtyLists.clear();
  fill(await loadSettings());
  $('backupStatus').textContent = t('resetDone');
});

$('editShortcut').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));

// Another window (or the popup's mode switch) may change settings while this page is open.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'sync' || !changes.settings) return;
  fill(await loadSettings());
});
