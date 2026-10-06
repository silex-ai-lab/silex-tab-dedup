import { expect, test, until } from './fixtures.js';

const urlsOf = (tabs) => tabs.map((t) => t.url).filter((u) => u.startsWith('http'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const count = async (ext, url) => (await ext.tabs()).filter((t) => t.url === url).length;

test('opening the same page twice closes the new tab and focuses the old one', async ({ ext, server }) => {
  const url = server.url('a.test', '/one');
  const first = await ext.open(url);
  await ext.open(server.url('b.test', '/other'));
  const second = await ext.open(url);
  await until(async () => (await count(ext, url)) === 1);
  expect((await ext.tabs()).find((t) => t.id === second)).toBeUndefined();
  await expect.poll(async () => (await ext.tabs()).find((t) => t.id === first)?.active).toBe(true);
});

test('tracking parameters, www and trailing slashes do not make a page different', async ({ ext, server }) => {
  await ext.open(server.url('a.test', '/doc'));
  await ext.open(server.url('www.a.test', '/doc/?utm_source=mail&fbclid=1'));
  await until(async () => urlsOf(await ext.tabs()).length === 1);
  expect(urlsOf(await ext.tabs())).toHaveLength(1);
});

test('a different #fragment is a different page unless ignoreHash is on', async ({ ext, server }) => {
  await ext.open(server.url('a.test', '/app#inbox'));
  await ext.open(server.url('a.test', '/app#sent'));
  await sleep(800);
  expect(urlsOf(await ext.tabs())).toHaveLength(2);

  // With ignoreHash the new tab is closed; the two tabs that already existed are not touched.
  await ext.settings({ ignoreHash: true });
  const drafts = await ext.open(server.url('a.test', '/app#drafts'));
  await until(async () => !(await ext.tabs()).some((t) => t.id === drafts));
  expect(urlsOf(await ext.tabs())).toHaveLength(2);
});

test('whitelisted pages are never closed', async ({ ext, server }) => {
  await ext.settings({ whitelist: ['a.test'] });
  const url = server.url('a.test', '/one');
  await ext.open(url);
  await ext.open(url);
  await sleep(800);
  expect(await count(ext, url)).toBe(2);
});

test('a pinned tab wins, and a pinned tab is never closed', async ({ ext, server }) => {
  const url = server.url('a.test', '/pin');
  const pinned = await ext.open(url, { pinned: true });
  await sleep(300);
  await ext.open(url);
  await until(async () => (await count(ext, url)) === 1);
  expect((await ext.tabs()).find((t) => t.url === url)?.id).toBe(pinned);

  // Navigating a second pinned tab onto the same page leaves it alone.
  const other = await ext.open(server.url('b.test', '/x'), { pinned: true });
  await sleep(300);
  await ext.call(([id, url]) => chrome.tabs.update(id, { url }), [other, url]);
  await sleep(800);
  expect(await count(ext, url)).toBe(2);
});

test('an existing tab navigated to an open page goes back instead of closing', async ({ ext, server }) => {
  const target = server.url('a.test', '/target');
  const home = server.url('b.test', '/home');
  await ext.open(target);
  const tab = await ext.open(home);
  await until(async () => (await ext.tabs()).find((t) => t.id === tab)?.url === home);
  await sleep(200);
  await ext.call(([id, url]) => chrome.tabs.update(id, { url }), [tab, target]);
  // Wait for the extension to act before checking where the tab ended up.
  await expect.poll(() => ext.call(async () => (await chrome.storage.session.get('undo')).undo?.[0]?.kind)).toBe('back');
  await expect.poll(async () => (await ext.tabs()).find((t) => t.id === tab)?.url).toBe(home);
  const tabs = await ext.tabs();
  expect(tabs.find((t) => t.id === tab)?.url).toBe(home);
  expect(tabs.filter((t) => t.url === target)).toHaveLength(1);
  await expect.poll(async () => (await ext.tabs()).find((t) => t.url === target)?.active).toBe(true);
});

test('a server redirect that lands on an open page is caught', async ({ ext, server }) => {
  const target = server.url('a.test', '/landing');
  await ext.open(target);
  await ext.open(server.url('short.test', `/redirect?to=${encodeURIComponent(target)}`));
  await until(async () => (await count(ext, target)) === 1 && (await ext.tabs()).length <= 2);
  expect(await count(ext, target)).toBe(1);
});

test('Duplicate Tab, reload and restore are left alone', async ({ ext, server }) => {
  const url = server.url('a.test', '/dup');
  const id = await ext.open(url);
  await sleep(500);
  await ext.call((id) => chrome.tabs.duplicate(id), id);
  await sleep(800);
  expect(await count(ext, url)).toBe(2);
  await ext.call((id) => chrome.tabs.reload(id), id);
  await sleep(800);
  expect(await count(ext, url)).toBe(2);
});

test('scope=window only looks inside one window', async ({ ext, server }) => {
  await ext.settings({ scope: 'window' });
  const url = server.url('a.test', '/w');
  await ext.open(url);
  await ext.call((url) => chrome.windows.create({ url }), url);
  await sleep(1000);
  expect(await count(ext, url)).toBe(2);
});

test('ask mode keeps the tab and shows a notification', async ({ ext, server }) => {
  await ext.settings({ mode: 'ask' });
  const url = server.url('a.test', '/ask');
  await ext.open(url);
  await ext.open(url);
  await expect
    .poll(() => ext.call(async () => Object.keys(await chrome.notifications.getAll()).some((n) => n.startsWith('ask:'))))
    .toBe(true);
  expect(await count(ext, url)).toBe(2);
});

test('off mode only counts duplicates on the badge', async ({ ext, server }) => {
  await ext.settings({ mode: 'off' });
  const url = server.url('a.test', '/badge');
  for (let i = 0; i < 3; i++) await ext.open(url);
  expect(await until(async () => (await ext.badge()) === '2')).toBe(true);
  expect(await count(ext, url)).toBe(3);
});
