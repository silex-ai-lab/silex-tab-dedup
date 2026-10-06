import { describe, expect, it } from 'vitest';
import { buildSession, exportHtml, exportJson, isSaveable, parseImport, tabCount } from '../../src/core/sessions.js';

let n = 0;
const id = () => `id${++n}`;

describe('sessions', () => {
  const tabs = [
    { windowId: 2, index: 1, url: 'https://b.com/', title: 'B' },
    { windowId: 1, index: 1, url: 'chrome://newtab/', title: 'New Tab' },
    { windowId: 1, index: 0, url: 'https://a.com/?q=1&r=<2>', title: 'A & "quotes"', pinned: true },
    { windowId: 2, index: 0, url: 'https://c.com/', title: '' },
  ];

  it('builds windows in tab order and skips new tab pages', () => {
    const s = buildSession(tabs, 'Work', 1000, 'x');
    expect(s.windows).toHaveLength(2);
    expect(s.windows[0].tabs).toEqual([{ url: 'https://a.com/?q=1&r=<2>', title: 'A & "quotes"', pinned: true }]);
    expect(s.windows[1].tabs.map((t) => t.url)).toEqual(['https://c.com/', 'https://b.com/']);
    expect(tabCount(s)).toBe(3);
    expect(isSaveable('chrome://newtab/')).toBe(false);
    expect(isSaveable('chrome://settings/')).toBe(true);
  });

  it('round-trips through JSON', () => {
    const s = buildSession(tabs, 'Work', 1000, 'x');
    const back = parseImport(exportJson([s]), 'Imported', id, 5);
    expect(back).toHaveLength(1);
    expect(back[0].name).toBe('Work');
    expect(back[0].createdAt).toBe(1000);
    expect(back[0].windows).toEqual(s.windows);
    expect(back[0].id).not.toBe('x');
  });

  it('exports escaped bookmark HTML that imports back as links', () => {
    const s = buildSession(tabs, 'Work <1>', 1000, 'x');
    const html = exportHtml([s]);
    expect(html).toContain('<H3 ADD_DATE="1">Work &lt;1&gt;</H3>');
    expect(html).toContain('HREF="https://a.com/?q=1&amp;r=&lt;2&gt;"');
    expect(html).toContain('>A &amp; &quot;quotes&quot;</A>');
    const back = parseImport(html, 'Imported', id, 5);
    expect(back[0].windows[0].tabs.map((t) => t.url)).toEqual(['https://a.com/?q=1&r=<2>', 'https://c.com/', 'https://b.com/']);
    expect(back[0].windows[0].tabs[0].title).toBe('A & "quotes"');
  });

  it('imports bare URL lists and rejects junk', () => {
    const back = parseImport('see https://x.com/a and\nhttp://y.org/b?c=1 javascript:alert(1)', 'List', id, 7);
    expect(back[0].windows[0].tabs.map((t) => t.url)).toEqual(['https://x.com/a', 'http://y.org/b?c=1']);
    expect(parseImport('nothing here', 'x', id, 1)).toEqual([]);
    expect(parseImport('{"sessions":[{"name":"e","tabs":[{"url":"javascript:alert(1)"}]}]}', 'x', id, 1)).toEqual([]);
    expect(parseImport('{bad json', 'x', id, 1)).toEqual([]);
  });

  it('accepts a flat tabs list per session in JSON', () => {
    const back = parseImport('[{"name":"Flat","tabs":[{"url":"https://a.com/","pinned":true}]}]', 'x', id, 1);
    expect(back[0].windows[0].tabs).toEqual([{ url: 'https://a.com/', title: undefined, pinned: true }]);
  });
});
