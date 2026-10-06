// Turns a tab URL into the key used to decide whether two tabs are duplicates.
// Pure: no chrome.* calls, so it runs under Node for unit tests.

/** Query parameters that only track where a click came from. */
export const TRACKING_PARAMS = [
  /^utm_/,
  'fbclid',
  'gclid',
  'dclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'yclid',
  'twclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'mkt_tok',
  'ref_src',
];

const NEW_TAB_URLS = new Set([
  'chrome://newtab/',
  'chrome://new-tab-page/',
  'chrome-search://local-ntp/local-ntp.html',
  'edge://newtab/',
  'about:blank',
  'about:newtab',
]);

const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:', 'file:', 'chrome:', 'edge:']);

/**
 * @typedef {object} NormalizeOptions
 * @property {boolean} [ignoreHash]          drop everything after '#'
 * @property {boolean} [ignoreWww]           treat www.example.com as example.com
 * @property {boolean} [ignoreCase]          compare path and query case-insensitively
 * @property {boolean} [ignoreQuery]         drop the whole query string
 * @property {boolean} [stripTracking]       drop utm_* and other tracking parameters
 * @property {boolean} [ignoreTrailingSlash] treat /docs/ as /docs
 */

/**
 * A host alias rule: hosts matching `test` are compared as `canonical`.
 * @typedef {{ test: RegExp, canonical: string }} HostAlias
 */

/**
 * Compiles host alias patterns such as 'yandex.*' (yandex.ru = yandex.com).
 * '*' matches any run of characters, dots included; the canonical host is the
 * pattern with each '*' replaced by 'x'.
 * @param {string[]} patterns
 * @returns {HostAlias[]}
 */
export function compileHostAliases(patterns) {
  return patterns
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p && !p.startsWith('#') && /^[a-z0-9*.-]+$/.test(p))
    .map((p) => ({
      test: new RegExp('^' + p.split('*').map((s) => s.replace(/[.-]/g, '\\$&')).join('.*') + '$'),
      canonical: p.replace(/\*/g, 'x'),
    }));
}

function isTrackingParam(name) {
  const lower = name.toLowerCase();
  return TRACKING_PARAMS.some((p) => (typeof p === 'string' ? p === lower : p.test(lower)));
}

/**
 * Returns the comparison key for a URL, or null when the URL should never be
 * treated as a duplicate (new tab page, about:blank, unsupported scheme, junk).
 * @param {string | undefined} url
 * @param {NormalizeOptions} [opts]
 * @param {HostAlias[]} [aliases]
 * @returns {string | null}
 */
export function normalizeUrl(url, opts = {}, aliases = []) {
  if (!url || NEW_TAB_URLS.has(url)) return null;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (!SUPPORTED_PROTOCOLS.has(u.protocol)) return null;
  if (NEW_TAB_URLS.has(`${u.protocol}//${u.host}${u.pathname}`)) return null;

  let host = u.host; // already lower-cased and punycoded by URL
  if (opts.ignoreWww && host.startsWith('www.')) host = host.slice(4);
  const alias = aliases.find((a) => a.test.test(u.hostname.replace(/^www\./, '')));
  if (alias) host = alias.canonical + (u.port ? `:${u.port}` : '');

  let path = u.pathname;
  if (opts.ignoreTrailingSlash && path.length > 1 && path.endsWith('/')) {
    path = path.replace(/\/+$/, '') || '/';
  }

  let query = '';
  if (!opts.ignoreQuery) {
    const params = [...u.searchParams.entries()].filter(
      ([name]) => !(opts.stripTracking && isTrackingParam(name)),
    );
    // Stable sort by name, so ?a=1&b=2 equals ?b=2&a=1 but repeated keys keep their order.
    params.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    if (params.length) query = '?' + new URLSearchParams(params).toString();
  }

  // A bare '#' carries no information, so it never makes two tabs different.
  const hash = opts.ignoreHash || u.hash === '#' ? '' : u.hash;

  let rest = path + query + hash;
  if (opts.ignoreCase) rest = rest.toLowerCase();
  return `${u.protocol}//${host}${rest}`;
}
