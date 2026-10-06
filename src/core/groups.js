// Groups open tabs into sets of duplicates and decides which tab of a set to keep.

import { compileHostAliases, normalizeUrl } from './normalize.js';
import { compilePattern, compilePatterns } from './patterns.js';

/**
 * The subset of chrome.tabs.Tab the core logic reads.
 * @typedef {object} TabLike
 * @property {number} id
 * @property {number} windowId
 * @property {number} [index]
 * @property {string} [url]
 * @property {string} [pendingUrl]
 * @property {string} [title]
 * @property {boolean} [pinned]
 * @property {boolean} [active]
 * @property {boolean} [incognito]
 */

/**
 * Builds the function that maps a tab to its duplicate key (null = never a duplicate).
 * Incognito tabs never match normal tabs, and with scope 'window' tabs only
 * match tabs in the same window. A URL matching a group rule gets that rule's key,
 * so every page under the rule counts as the same page.
 * @param {import('./settings.js').Settings} settings
 * @returns {(tab: TabLike) => string | null}
 */
export function makeKeyFn(settings) {
  const whitelisted = compilePatterns(settings.whitelist);
  const rules = settings.groupRules.map(compilePattern);
  const aliases = compileHostAliases(settings.hostAliases);
  return (tab) => {
    const url = tab.url || tab.pendingUrl;
    if (!url) return null;
    if (tab.incognito && settings.skipIncognito) return null;
    const normalized = normalizeUrl(url, settings, aliases);
    if (normalized === null || whitelisted(url)) return null;
    const rule = rules.findIndex((m) => m?.(url));
    const key = rule >= 0 ? `rule:${rule}` : normalized;
    return scopePrefix(tab, settings) + key;
  };
}

function scopePrefix(tab, settings) {
  const space = tab.incognito ? 'private' : 'normal';
  return settings.scope === 'window' ? `${space}|${tab.windowId}|` : `${space}|`;
}

/**
 * Title key used when settings.matchTitle is on: the trimmed, lower-cased title,
 * or null when the title says nothing (empty, or just the URL).
 */
function titleKey(tab, settings) {
  const title = (tab.title ?? '').trim().toLowerCase();
  const url = tab.url || tab.pendingUrl || '';
  if (!title || url.toLowerCase().includes(title) || title.length < 3) return null;
  return scopePrefix(tab, settings) + 'title:' + title;
}

/**
 * Returns every set of two or more duplicate tabs, in tab order. With
 * settings.matchTitle, tabs that share a URL key or a title are joined into one set.
 * @param {TabLike[]} tabs
 * @param {import('./settings.js').Settings} settings
 * @returns {{ key: string, tabs: TabLike[] }[]}
 */
export function findDuplicateGroups(tabs, settings) {
  const keyOf = makeKeyFn(settings);
  // Union-find over tab indexes, joined through each shared key.
  const parent = tabs.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  /** @type {Map<string, number>} */
  const firstWithKey = new Map();
  /** @type {(string | null)[]} */
  const urlKeys = tabs.map(keyOf);
  const join = (key, i) => {
    const j = firstWithKey.get(key);
    if (j === undefined) firstWithKey.set(key, i);
    else parent[find(i)] = find(j);
  };
  tabs.forEach((tab, i) => {
    if (urlKeys[i] === null) return;
    join(urlKeys[i], i);
    if (settings.matchTitle) {
      const tk = titleKey(tab, settings);
      if (tk) join(tk, i);
    }
  });
  /** @type {Map<number, TabLike[]>} */
  const byRoot = new Map();
  tabs.forEach((tab, i) => {
    if (urlKeys[i] === null) return;
    const root = find(i);
    const list = byRoot.get(root);
    if (list) list.push(tab);
    else byRoot.set(root, [tab]);
  });
  return [...byRoot]
    .filter(([, list]) => list.length > 1)
    .map(([root, list]) => ({ key: /** @type {string} */ (urlKeys[root]), tabs: list }));
}

/** Number of tabs that would be closed if every group were cleaned up. */
export function countDuplicates(groups) {
  return groups.reduce((n, g) => n + g.tabs.length - 1, 0);
}

/**
 * Picks the tab to keep from a duplicate set. Order of preference:
 *   1. pinned tab
 *   2. the active tab of the focused window (only when preferActive)
 *   3. the active tab of any window (only when preferActive)
 *   4. the older tab (lower id) or newer tab, per settings.keep
 * @param {TabLike[]} tabs
 * @param {{ keep: 'older' | 'newer' }} settings
 * @param {{ preferActive?: boolean, focusedWindowId?: number }} [ctx]
 * @returns {TabLike}
 */
export function pickKeeper(tabs, settings, ctx = {}) {
  const rank = (t) => [
    t.pinned ? 0 : 1,
    ctx.preferActive && t.active && t.windowId === ctx.focusedWindowId ? 0 : 1,
    ctx.preferActive && t.active ? 0 : 1,
    settings.keep === 'newer' ? -t.id : t.id,
  ];
  return [...tabs].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
    return 0;
  })[0];
}

/**
 * The tabs to close for one group: everything except the keeper, minus pinned
 * tabs when they are protected.
 * @param {TabLike[]} tabs
 * @param {TabLike} keeper
 * @param {{ protectPinned: boolean }} settings
 */
export function tabsToClose(tabs, keeper, settings) {
  return tabs.filter((t) => t.id !== keeper.id && !(settings.protectPinned && t.pinned));
}
