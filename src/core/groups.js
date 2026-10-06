// Groups open tabs into sets of duplicates and decides which tab of a set to keep.

import { normalizeUrl } from './normalize.js';
import { compilePatterns } from './patterns.js';

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
 * match tabs in the same window.
 * @param {import('./settings.js').Settings} settings
 * @returns {(tab: TabLike) => string | null}
 */
export function makeKeyFn(settings) {
  const whitelisted = compilePatterns(settings.whitelist);
  return (tab) => {
    const url = tab.url || tab.pendingUrl;
    if (!url) return null;
    if (tab.incognito && settings.skipIncognito) return null;
    const key = normalizeUrl(url, settings);
    if (key === null || whitelisted(url)) return null;
    const space = tab.incognito ? 'private' : 'normal';
    return settings.scope === 'window' ? `${space}|${tab.windowId}|${key}` : `${space}|${key}`;
  };
}

/**
 * Returns every set of two or more duplicate tabs, in tab order.
 * @param {TabLike[]} tabs
 * @param {import('./settings.js').Settings} settings
 * @returns {{ key: string, tabs: TabLike[] }[]}
 */
export function findDuplicateGroups(tabs, settings) {
  const keyOf = makeKeyFn(settings);
  /** @type {Map<string, TabLike[]>} */
  const byKey = new Map();
  for (const tab of tabs) {
    const key = keyOf(tab);
    if (key === null) continue;
    const list = byKey.get(key);
    if (list) list.push(tab);
    else byKey.set(key, [tab]);
  }
  return [...byKey]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({ key, tabs: list }));
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
