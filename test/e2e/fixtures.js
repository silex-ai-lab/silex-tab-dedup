// Playwright fixtures: a Chromium with the unpacked extension loaded, a local
// web server that every hostname resolves to, and helpers that drive tabs from
// the extension's service worker (the same API calls a user's clicks produce).
import { test as base, chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const EXT = path.resolve(import.meta.dirname, '../..');

function startServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/redirect') {
      res.writeHead(302, { location: url.searchParams.get('to') });
      return res.end();
    }
    const title = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || 'home');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><title>${title}</title><a id="self" href="${req.url}">self</a><p>${title}</p>`);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  server: [async ({}, use) => {
    const server = await startServer();
    await use({ port: server.address().port, url: (host, p) => `http://${host}:${server.address().port}${p}` });
    server.close();
  }, { scope: 'worker' }],

  context: async ({ server }, use) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'tab-dedup-'));
    const context = await chromium.launchPersistentContext(dir, {
      channel: 'chromium',
      headless: !process.env.HEADED,
      args: [
        `--disable-extensions-except=${EXT}`,
        `--load-extension=${EXT}`,
        `--host-resolver-rules=MAP * 127.0.0.1`,
        '--no-first-run',
      ],
    });
    void server;
    await use(context);
    await context.close();
    rmSync(dir, { recursive: true, force: true });
  },

  sw: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    await use(worker);
  },

  extId: async ({ sw }, use) => {
    await use(new URL(sw.url()).host);
  },

  ext: async ({ sw }, use) => {
    const call = (fn, ...args) => sw.evaluate(fn, ...args);
    await use({
      call,
      tabs: () => call(async () => (await chrome.tabs.query({})).map((t) => ({ id: t.id, url: t.url || t.pendingUrl, active: t.active, pinned: t.pinned, windowId: t.windowId }))),
      open: (url, opts = {}) => call(async ([url, opts]) => (await chrome.tabs.create({ url, ...opts })).id, [url, opts]),
      settings: (patch) => call(async (patch) => {
        const { settings } = await chrome.storage.sync.get('settings');
        await chrome.storage.sync.set({ settings: { ...(settings || {}), ...patch } });
      }, patch),
      badge: () => call(() => chrome.action.getBadgeText({})),
      message: (msg) => call(async (msg) => {
        // The worker cannot message itself; call the same handler through a popup-less path.
        return await new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
      }, msg),
    });
  },
});

/** Polls until fn() returns a truthy value or the timeout passes. */
export async function until(fn, { timeout = 5000, interval = 100 } = {}) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await new Promise((r) => setTimeout(r, interval));
  }
  return last;
}

export { expect };
