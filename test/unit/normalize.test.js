import { describe, expect, it } from 'vitest';
import { normalizeUrl } from '../../src/core/normalize.js';
import { DEFAULT_SETTINGS } from '../../src/core/settings.js';

const d = DEFAULT_SETTINGS;
const same = (a, b, opts = d) => expect(normalizeUrl(a, opts)).toBe(normalizeUrl(b, opts));
const diff = (a, b, opts = d) => expect(normalizeUrl(a, opts)).not.toBe(normalizeUrl(b, opts));

describe('normalizeUrl', () => {
  it('ignores pages that are never duplicates', () => {
    for (const url of ['', undefined, 'about:blank', 'chrome://newtab/', 'chrome://new-tab-page/', 'not a url', 'javascript:void(0)', 'data:text/html,hi', 'chrome-extension://abc/popup.html']) {
      expect(normalizeUrl(url, d)).toBeNull();
    }
  });

  it('keeps supported schemes', () => {
    expect(normalizeUrl('https://example.com/', d)).toBe('https://example.com/');
    expect(normalizeUrl('file:///Users/me/a.pdf', d)).toBe('file:///Users/me/a.pdf');
    expect(normalizeUrl('chrome://settings/', d)).toBe('chrome://settings/');
  });

  it('lower-cases the host, drops default ports, punycodes IDN', () => {
    same('HTTPS://Example.COM:443/a', 'https://example.com/a');
    same('http://example.com:80/a', 'http://example.com/a');
    same('https://bücher.de/x', 'https://xn--bcher-kva.de/x');
    diff('https://example.com:8443/a', 'https://example.com/a');
  });

  it('never merges http with https', () => {
    diff('http://example.com/a', 'https://example.com/a');
  });

  it('strips tracking parameters by default', () => {
    same('https://a.com/p?utm_source=x&utm_medium=y', 'https://a.com/p');
    same('https://a.com/p?id=3&fbclid=abc', 'https://a.com/p?id=3');
    same('https://a.com/p?UTM_Campaign=z&gclid=1', 'https://a.com/p');
    diff('https://a.com/p?utm_source=x', 'https://a.com/p', { ...d, stripTracking: false });
  });

  it('treats parameter order as irrelevant but keeps repeated keys in order', () => {
    same('https://a.com/?a=1&b=2', 'https://a.com/?b=2&a=1');
    diff('https://a.com/?t=1&t=2', 'https://a.com/?t=2&t=1');
    diff('https://a.com/?id=1', 'https://a.com/?id=2');
  });

  it('keeps the hash unless told otherwise', () => {
    diff('https://mail.google.com/mail/u/0/#inbox', 'https://mail.google.com/mail/u/0/#sent');
    same('https://a.com/p#', 'https://a.com/p');
    same('https://a.com/p#intro', 'https://a.com/p#setup', { ...d, ignoreHash: true });
  });

  it('honours www, trailing slash, case and query options', () => {
    same('https://www.a.com/x', 'https://a.com/x');
    diff('https://www.a.com/x', 'https://a.com/x', { ...d, ignoreWww: false });
    same('https://a.com/docs/', 'https://a.com/docs');
    same('https://a.com/', 'https://a.com');
    diff('https://a.com/docs/', 'https://a.com/docs', { ...d, ignoreTrailingSlash: false });
    diff('https://a.com/Docs', 'https://a.com/docs');
    same('https://a.com/Docs', 'https://a.com/docs', { ...d, ignoreCase: true });
    same('https://a.com/s?q=1', 'https://a.com/s?q=2', { ...d, ignoreQuery: true });
  });

  it('does not strip www from other subdomains', () => {
    diff('https://www2.a.com/', 'https://a.com/');
  });
});
