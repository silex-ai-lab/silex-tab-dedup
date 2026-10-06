// Quick tab search: every whitespace-separated term must appear in the title or
// URL (case-insensitive). Title hits rank above URL-only hits.

/**
 * @template {{ title?: string, url?: string }} T
 * @param {T[]} items
 * @param {string} query
 * @returns {T[]}
 */
export function searchTabs(items, query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const scored = [];
  items.forEach((item, order) => {
    const title = (item.title ?? '').toLowerCase();
    const url = (item.url ?? '').toLowerCase().replace(/^[a-z]+:\/\/(www\.)?/, '');
    let score = 0;
    for (const term of terms) {
      if (title.startsWith(term)) score += 4;
      else if (title.includes(term)) score += 3;
      else if (url.startsWith(term)) score += 2;
      else if (url.includes(term)) score += 1;
      else return;
    }
    scored.push({ item, score, order });
  });
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  return scored.map((s) => s.item);
}

/** Groups items by host, largest group first; non-URL items go under their scheme. */
export function groupByHost(items) {
  /** @type {Map<string, typeof items>} */
  const groups = new Map();
  for (const item of items) {
    let host;
    try {
      const u = new URL(item.url ?? '');
      host = u.hostname.replace(/^www\./, '') || u.protocol.replace(':', '');
    } catch {
      host = '?';
    }
    const list = groups.get(host);
    if (list) list.push(item);
    else groups.set(host, [item]);
  }
  return [...groups]
    .map(([host, list]) => ({ host, tabs: list }))
    .sort((a, b) => b.tabs.length - a.tabs.length || a.host.localeCompare(b.host));
}
