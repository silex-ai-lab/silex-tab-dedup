import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, migrateSettings } from '../../src/core/settings.js';

describe('migrateSettings', () => {
  it('returns defaults for nothing stored', () => {
    expect(migrateSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });
  it('keeps valid values and drops invalid or unknown ones', () => {
    const s = migrateSettings({ mode: 'ask', scope: 'galaxy', ignoreHash: 'yes', whitelist: ['a.com', 3], bogus: 1 });
    expect(s.mode).toBe('ask');
    expect(s.scope).toBe('all');
    expect(s.ignoreHash).toBe(false);
    expect(s.whitelist).toEqual(['a.com']);
    expect('bogus' in s).toBe(false);
  });
  it('does not share the default whitelist array', () => {
    migrateSettings({}).whitelist.push('x');
    expect(DEFAULT_SETTINGS.whitelist).toEqual([]);
  });
});
