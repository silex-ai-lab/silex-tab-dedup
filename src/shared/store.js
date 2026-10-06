// chrome.storage wrappers shared by the service worker, the popup and the options page.

import { migrateSettings } from '../core/settings.js';

/** @returns {Promise<import('../core/settings.js').Settings>} */
export async function loadSettings() {
  const { settings } = await chrome.storage.sync.get('settings');
  return migrateSettings(settings);
}

let saving = Promise.resolve();

/**
 * Merges a patch into the stored settings. Saves from one page run one at a time,
 * so two quick edits cannot overwrite each other.
 * @param {Partial<import('../core/settings.js').Settings>} patch
 */
export function saveSettings(patch) {
  const run = saving.then(async () => {
    const current = await loadSettings();
    const next = migrateSettings({ ...current, ...patch });
    await chrome.storage.sync.set({ settings: next });
    return next;
  });
  saving = run.catch(() => {});
  return run;
}

/** Fills every [data-i18n] element's text and [data-i18n-title] tooltip from _locales. */
export function localizePage(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    const text = chrome.i18n.getMessage(el.getAttribute('data-i18n'));
    if (text) el.textContent = text;
  }
  for (const el of root.querySelectorAll('[data-i18n-title]')) {
    const text = chrome.i18n.getMessage(el.getAttribute('data-i18n-title'));
    if (text) el.setAttribute('title', text);
  }
  for (const el of root.querySelectorAll('[data-i18n-placeholder]')) {
    const text = chrome.i18n.getMessage(el.getAttribute('data-i18n-placeholder'));
    if (text) el.setAttribute('placeholder', text);
  }
  document.documentElement.lang = chrome.i18n.getUILanguage();
}

/** Shorthand for chrome.i18n.getMessage with a fallback for missing keys. */
export function t(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

/** Chrome's cached favicon for a page (needs the "favicon" permission). */
export function faviconUrl(pageUrl, size = 16) {
  const u = new URL(chrome.runtime.getURL('/_favicon/'));
  u.searchParams.set('pageUrl', pageUrl);
  u.searchParams.set('size', String(size));
  return u.toString();
}
