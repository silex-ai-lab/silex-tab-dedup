import { describe, expect, it } from 'vitest';
import { countDuplicates, findDuplicateGroups, pickKeeper, tabsToClose } from '../../src/core/groups.js';
import { DEFAULT_SETTINGS } from '../../src/core/settings.js';

const S = DEFAULT_SETTINGS;
let nextId = 1;
const tab = (url, extra = {}) => ({ id: nextId++, windowId: 1, url, ...extra });

describe('findDuplicateGroups', () => {
  it('groups tabs with the same key and ignores singletons', () => {
    const a1 = tab('https://a.com/x');
    const a2 = tab('https://www.a.com/x?utm_source=t');
    const b = tab('https://b.com/');
    const groups = findDuplicateGroups([a1, b, a2], S);
    expect(groups).toHaveLength(1);
    expect(groups[0].tabs.map((t) => t.id)).toEqual([a1.id, a2.id]);
    expect(countDuplicates(groups)).toBe(1);
  });

  it('uses pendingUrl when url is not set yet', () => {
    const groups = findDuplicateGroups([tab('https://a.com/'), tab('', { pendingUrl: 'https://a.com/' })], S);
    expect(countDuplicates(groups)).toBe(1);
  });

  it('respects scope=window', () => {
    const tabs = [tab('https://a.com/', { windowId: 1 }), tab('https://a.com/', { windowId: 2 })];
    expect(findDuplicateGroups(tabs, S)).toHaveLength(1);
    expect(findDuplicateGroups(tabs, { ...S, scope: 'window' })).toHaveLength(0);
  });

  it('never matches incognito with normal tabs, and can skip incognito', () => {
    const tabs = [tab('https://a.com/'), tab('https://a.com/', { incognito: true }), tab('https://a.com/', { incognito: true })];
    const groups = findDuplicateGroups(tabs, S);
    expect(groups).toHaveLength(1);
    expect(groups[0].tabs.every((t) => t.incognito)).toBe(true);
    expect(findDuplicateGroups(tabs, { ...S, skipIncognito: true })).toHaveLength(0);
  });

  it('skips whitelisted URLs and new tab pages', () => {
    const tabs = [tab('https://mail.google.com/'), tab('https://mail.google.com/'), tab('chrome://newtab/'), tab('chrome://newtab/')];
    expect(findDuplicateGroups(tabs, { ...S, whitelist: ['google.com'] })).toHaveLength(0);
  });
});

describe('pickKeeper / tabsToClose', () => {
  it('keeps the older tab by default and the newer when asked', () => {
    const a = tab('https://a.com/');
    const b = tab('https://a.com/');
    expect(pickKeeper([b, a], S).id).toBe(a.id);
    expect(pickKeeper([a, b], { ...S, keep: 'newer' }).id).toBe(b.id);
  });

  it('prefers pinned, then (when asked) the active tab of the focused window', () => {
    const old = tab('https://a.com/');
    const activeOther = tab('https://a.com/', { active: true, windowId: 2 });
    const activeHere = tab('https://a.com/', { active: true, windowId: 1 });
    const pinned = tab('https://a.com/', { pinned: true });
    expect(pickKeeper([old, activeOther, activeHere, pinned], S, { preferActive: true, focusedWindowId: 1 }).id).toBe(pinned.id);
    expect(pickKeeper([old, activeOther, activeHere], S, { preferActive: true, focusedWindowId: 1 }).id).toBe(activeHere.id);
    expect(pickKeeper([old, activeOther], S, { preferActive: true, focusedWindowId: 1 }).id).toBe(activeOther.id);
    expect(pickKeeper([old, activeOther, activeHere], S).id).toBe(old.id);
  });

  it('never closes protected pinned tabs', () => {
    const p1 = tab('https://a.com/', { pinned: true });
    const p2 = tab('https://a.com/', { pinned: true });
    const n = tab('https://a.com/');
    const keeper = pickKeeper([p1, p2, n], S);
    expect(keeper.id).toBe(p1.id);
    expect(tabsToClose([p1, p2, n], keeper, S).map((t) => t.id)).toEqual([n.id]);
    expect(tabsToClose([p1, p2, n], keeper, { ...S, protectPinned: false }).map((t) => t.id)).toEqual([p2.id, n.id]);
  });
});
