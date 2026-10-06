// Settings shape, defaults and migration. Pure, so the options page,
// the service worker and the unit tests share one definition.

export const SCHEMA_VERSION = 1;

/**
 * @typedef {object} Settings
 * @property {number} schemaVersion
 * @property {'auto' | 'ask' | 'off'} mode  what to do when a tab becomes a duplicate
 * @property {'all' | 'window'} scope       look for duplicates across all windows or per window
 * @property {'older' | 'newer'} keep       which tab survives when nothing else decides
 * @property {boolean} protectPinned        never close a pinned tab
 * @property {boolean} skipIncognito        ignore incognito tabs entirely
 * @property {boolean} ignoreHash
 * @property {boolean} ignoreWww
 * @property {boolean} ignoreCase
 * @property {boolean} ignoreQuery
 * @property {boolean} stripTracking
 * @property {boolean} ignoreTrailingSlash
 * @property {string[]} whitelist           patterns that are never treated as duplicates
 * @property {string[]} groupRules          patterns; all URLs matching one pattern count as one page
 * @property {string[]} hostAliases         host globs such as 'yandex.*' whose hosts count as one
 * @property {boolean} matchTitle           tabs with the same title are duplicates too (popup, badge, shortcut)
 * @property {boolean} notifyOnClose        show a notification with Undo after each auto-close
 * @property {boolean} showBadge
 */

/** @type {Readonly<Settings>} */
export const DEFAULT_SETTINGS = Object.freeze({
  schemaVersion: SCHEMA_VERSION,
  mode: 'auto',
  scope: 'all',
  keep: 'older',
  protectPinned: true,
  skipIncognito: false,
  // Off by default: single-page apps such as Gmail (#inbox vs #sent) route on the hash.
  ignoreHash: false,
  ignoreWww: true,
  ignoreCase: false,
  ignoreQuery: false,
  stripTracking: true,
  ignoreTrailingSlash: true,
  whitelist: [],
  groupRules: [],
  hostAliases: [],
  matchTitle: false,
  notifyOnClose: false,
  showBadge: true,
});

const ENUMS = {
  mode: ['auto', 'ask', 'off'],
  scope: ['all', 'window'],
  keep: ['older', 'newer'],
};

/**
 * Fills in defaults and drops unknown or mistyped fields, so stored settings
 * from an older version (or a hand-edited import) always yield a valid object.
 * @param {unknown} stored
 * @returns {Settings}
 */
export function migrateSettings(stored) {
  /** @type {Record<string, unknown>} */
  const src = stored && typeof stored === 'object' ? /** @type {any} */ (stored) : {};
  /** @type {any} */
  const out = { ...DEFAULT_SETTINGS, whitelist: [], groupRules: [], hostAliases: [] };
  for (const [name, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (name === 'schemaVersion' || !(name in src)) continue;
    const value = src[name];
    if (name in ENUMS) {
      if (ENUMS[/** @type {keyof typeof ENUMS} */ (name)].includes(/** @type {string} */ (value))) {
        out[name] = value;
      }
    } else if (Array.isArray(def)) {
      if (Array.isArray(value)) out[name] = value.filter((v) => typeof v === 'string');
    } else if (typeof value === typeof def) {
      out[name] = value;
    }
  }
  out.schemaVersion = SCHEMA_VERSION;
  return out;
}
