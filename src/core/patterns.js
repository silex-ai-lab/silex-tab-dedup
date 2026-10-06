// Whitelist pattern syntax, shared by every rule list:
//   github.com           bare host: matches github.com and any subdomain
//   *.google.com/maps*   glob: '*' matches anything; tested against the full URL,
//                        the URL without its scheme, and that without 'www.'
//   /^https:\/\/x\//i    regular expression, wrapped in slashes, optional flags

/**
 * @typedef {(url: string) => boolean} Matcher
 */

function escapeRegExp(s) {
  return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compiles one pattern. Returns null for blank lines and invalid regexes.
 * @param {string} raw
 * @returns {Matcher | null}
 */
export function compilePattern(raw) {
  const pattern = raw.trim();
  if (!pattern || pattern.startsWith('#')) return null;

  const re = /^\/(.+)\/([a-z]*)$/.exec(pattern);
  if (re) {
    try {
      const rx = new RegExp(re[1], re[2]);
      return (url) => rx.test(url);
    } catch {
      return null;
    }
  }

  if (!pattern.includes('*') && !pattern.includes('/') && !pattern.includes(':')) {
    const host = pattern.toLowerCase().replace(/^\.+/, '');
    return (url) => {
      let h;
      try {
        h = new URL(url).hostname;
      } catch {
        return false;
      }
      return h === host || h.endsWith('.' + host);
    };
  }

  const rx = new RegExp('^' + pattern.split('*').map(escapeRegExp).join('.*') + '$', 'i');
  return (url) => {
    if (rx.test(url)) return true;
    const bare = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
    return rx.test(bare) || rx.test(bare.replace(/^www\./i, ''));
  };
}

/**
 * Compiles a list of patterns into one matcher. Invalid entries are skipped.
 * @param {string[]} patterns
 * @returns {Matcher}
 */
export function compilePatterns(patterns) {
  const matchers = patterns.map(compilePattern).filter(Boolean);
  return (url) => matchers.some((m) => m(url));
}

/**
 * Returns the patterns that do not compile, for the options page to flag.
 * @param {string[]} patterns
 */
export function invalidPatterns(patterns) {
  return patterns.filter((p) => {
    const t = p.trim();
    return t && !t.startsWith('#') && compilePattern(t) === null;
  });
}
