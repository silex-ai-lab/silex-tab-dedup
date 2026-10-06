import { describe, expect, it } from 'vitest';
import { compilePattern, compilePatterns, invalidPatterns } from '../../src/core/patterns.js';

describe('patterns', () => {
  it('bare host matches the domain and subdomains only', () => {
    const m = compilePattern('google.com');
    expect(m('https://google.com/')).toBe(true);
    expect(m('https://mail.google.com/mail')).toBe(true);
    expect(m('https://notgoogle.com/')).toBe(false);
    expect(m('https://google.com.evil.io/')).toBe(false);
  });

  it('globs match with or without the scheme', () => {
    const m = compilePattern('github.com/*/pull/*');
    expect(m('https://github.com/a/b/pull/1')).toBe(true);
    expect(m('https://github.com/a/b/issues/1')).toBe(false);
    const full = compilePattern('https://*.example.com/*');
    expect(full('https://docs.example.com/x')).toBe(true);
    expect(full('http://docs.example.com/x')).toBe(false);
  });

  it('globs escape regex metacharacters', () => {
    const m = compilePattern('a.com/x?y=*');
    expect(m('https://a.com/x?y=1')).toBe(true);
    expect(m('https://aXcom/x?y=1')).toBe(false);
  });

  it('supports /regex/flags', () => {
    const m = compilePattern('/youtube\\.com\\/watch/i');
    expect(m('https://www.YOUTUBE.com/watch?v=1')).toBe(true);
    expect(compilePattern('/(unclosed/')).toBeNull();
  });

  it('skips blanks and comments; reports invalid lines', () => {
    expect(compilePattern('   ')).toBeNull();
    expect(compilePattern('# note')).toBeNull();
    expect(invalidPatterns(['ok.com', '', '# c', '/(bad/'])).toEqual(['/(bad/']);
    const any = compilePatterns(['', 'a.com', '/(bad/']);
    expect(any('https://a.com/')).toBe(true);
    expect(any('https://b.com/')).toBe(false);
  });
});
