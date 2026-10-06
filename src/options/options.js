import { invalidPatterns } from '../core/patterns.js';
import { loadSettings, localizePage, saveSettings, t } from '../shared/store.js';

const $ = (id) => document.getElementById(id);
let savedTimer = 0;

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
  /** @type {HTMLTextAreaElement} */ ($('whitelist')).value = settings.whitelist.join('\n');
}

function checkWhitelist(lines) {
  const bad = invalidPatterns(lines);
  const el = $('whitelistError');
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

let whitelistTimer = 0;
$('whitelist').addEventListener('input', () => {
  clearTimeout(whitelistTimer);
  whitelistTimer = setTimeout(() => {
    const lines = /** @type {HTMLTextAreaElement} */ ($('whitelist')).value.split('\n').map((l) => l.trim()).filter(Boolean);
    checkWhitelist(lines);
    save({ whitelist: lines });
  }, 400);
});

$('editShortcut').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));

// Another window (or the popup's mode switch) may change settings while this page is open.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'sync' || !changes.settings) return;
  if (document.activeElement?.id === 'whitelist') return;
  fill(await loadSettings());
});
