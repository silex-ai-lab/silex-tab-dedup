// Saved sessions: shape, building one from open tabs, and export/import formats.
// Pure, so the service worker, the pages and the tests share it.

import { normalizeUrl } from './normalize.js';

export const SESSIONS_FORMAT = 'silex-tab-dedup/sessions';

/**
 * @typedef {{ url: string, title?: string, pinned?: boolean }} SavedTab
 * @typedef {{ tabs: SavedTab[] }} SavedWindow
 * @typedef {{ id: string, name: string, createdAt: number, windows: SavedWindow[] }} Session
 */

/** Whether a URL is worth saving and can be reopened by an extension. */
export function isSaveable(url) {
  return normalizeUrl(url) !== null && !/^chrome:\/\/(newtab|new-tab-page)/.test(url);
}

/**
 * Builds a session from open tabs, one saved window per browser window, in tab order.
 * @param {{ url?: string, title?: string, pinned?: boolean, windowId: number, index?: number }[]} tabs
 * @param {string} name
 * @param {number} now
 * @param {string} id
 * @returns {Session}
 */
export function buildSession(tabs, name, now, id) {
  /** @type {Map<number, SavedTab[]>} */
  const windows = new Map();
  const sorted = [...tabs].sort((a, b) => a.windowId - b.windowId || (a.index ?? 0) - (b.index ?? 0));
  for (const tab of sorted) {
    if (!tab.url || !isSaveable(tab.url)) continue;
    const list = windows.get(tab.windowId) ?? [];
    list.push({ url: tab.url, title: tab.title || undefined, pinned: tab.pinned || undefined });
    windows.set(tab.windowId, list);
  }
  return { id, name, createdAt: now, windows: [...windows.values()].map((list) => ({ tabs: list })) };
}

export function tabCount(session) {
  return session.windows.reduce((n, w) => n + w.tabs.length, 0);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function unescapeHtml(s) {
  return s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e]);
}

/** JSON export: lossless, re-importable. */
export function exportJson(sessions) {
  return JSON.stringify({ format: SESSIONS_FORMAT, version: 1, sessions }, null, 2);
}

/**
 * HTML export in the Netscape bookmark format, so the file also imports into any
 * browser's bookmarks. One folder per session, one sub-folder per extra window.
 */
export function exportHtml(sessions) {
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Tab Dedup sessions</TITLE>',
    '<H1>Tab Dedup sessions</H1>',
    '<DL><p>',
  ];
  for (const s of sessions) {
    const added = Math.floor(s.createdAt / 1000);
    lines.push(`  <DT><H3 ADD_DATE="${added}">${escapeHtml(s.name)}</H3>`, '  <DL><p>');
    s.windows.forEach((w, i) => {
      const indent = s.windows.length > 1 ? '      ' : '    ';
      if (s.windows.length > 1) lines.push(`    <DT><H3>Window ${i + 1}</H3>`, '    <DL><p>');
      for (const t of w.tabs) lines.push(`${indent}<DT><A HREF="${escapeHtml(t.url)}" ADD_DATE="${added}">${escapeHtml(t.title || t.url)}</A>`);
      if (s.windows.length > 1) lines.push('    </DL><p>');
    });
    lines.push('  </DL><p>');
  }
  lines.push('</DL><p>');
  return lines.join('\n') + '\n';
}

function cleanTab(t) {
  if (!t || typeof t.url !== 'string' || !isSaveable(t.url)) return null;
  return { url: t.url, title: typeof t.title === 'string' ? t.title : undefined, pinned: t.pinned === true || undefined };
}

/**
 * Parses an import file: our JSON export, or any HTML/text containing links
 * (a bookmarks export, a Tab Options export, a plain list of URLs).
 * @param {string} text
 * @param {string} fallbackName  name for sessions that do not carry one
 * @param {() => string} makeId
 * @param {number} now
 * @returns {Session[]}
 */
export function parseImport(text, fallbackName, makeId, now) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let data;
    try {
      data = JSON.parse(trimmed);
    } catch {
      data = null;
    }
    const list = Array.isArray(data) ? data : data?.sessions;
    if (Array.isArray(list)) {
      return list
        .map((s) => {
          const windows = (Array.isArray(s?.windows) ? s.windows : [{ tabs: s?.tabs }])
            .map((w) => ({ tabs: (Array.isArray(w?.tabs) ? w.tabs : []).map(cleanTab).filter(Boolean) }))
            .filter((w) => w.tabs.length);
          return {
            id: makeId(),
            name: typeof s?.name === 'string' && s.name.trim() ? s.name.trim() : fallbackName,
            createdAt: Number.isFinite(s?.createdAt) ? s.createdAt : now,
            windows,
          };
        })
        .filter((s) => s.windows.length);
    }
  }

  // Links: <a href="…">title</a>, falling back to bare URLs.
  const tabs = [];
  const anchor = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = anchor.exec(text))) {
    const title = unescapeHtml(m[2].replace(/<[^>]+>/g, '')).trim();
    const url = unescapeHtml(m[1]);
    const tab = cleanTab({ url, title: title && title !== url ? title : undefined });
    if (tab) tabs.push(tab);
  }
  if (!tabs.length) {
    for (const url of text.match(/\b(?:https?|file):\/\/[^\s"'<>]+/g) ?? []) {
      const tab = cleanTab({ url });
      if (tab) tabs.push(tab);
    }
  }
  return tabs.length ? [{ id: makeId(), name: fallbackName, createdAt: now, windows: [{ tabs }] }] : [];
}
