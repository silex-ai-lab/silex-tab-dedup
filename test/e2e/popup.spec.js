import { expect, test, until } from './fixtures.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('popup lists duplicates, closes them all, and undo brings them back', async ({ context, ext, extId, server }) => {
  await ext.settings({ mode: 'off' });
  const a = server.url('a.test', '/alpha');
  const b = server.url('b.test', '/beta');
  for (const url of [a, a, a, b, b]) await ext.open(url);
  await until(async () => (await ext.badge()) === '3');

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extId}/src/popup/popup.html`);
  await expect(popup.locator('.group')).toHaveCount(2);
  await expect(popup.locator('#count')).toHaveText('3');
  await expect(popup.locator('#closeAll')).toHaveText('Close 3 duplicates');

  await popup.locator('#closeAll').click();
  await expect(popup.locator('#empty')).toBeVisible();
  const urls = (await ext.tabs()).map((t) => t.url);
  expect(urls.filter((u) => u === a)).toHaveLength(1);
  expect(urls.filter((u) => u === b)).toHaveLength(1);
  expect(await until(async () => (await ext.badge()) === '')).toBe(true);

  await expect(popup.locator('#undoList li')).toHaveCount(1);
  await popup.locator('#undoList .undo-btn').click();
  await until(async () => (await ext.tabs()).filter((t) => t.url === a).length === 3);
  expect((await ext.tabs()).filter((t) => t.url === a)).toHaveLength(3);
});

test('undo after an automatic close restores the tab and does not close it again', async ({ context, ext, extId, server }) => {
  const url = server.url('a.test', '/undo');
  await ext.open(url);
  await ext.open(url);
  await until(async () => (await ext.tabs()).filter((t) => t.url === url).length === 1);

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extId}/src/popup/popup.html`);
  await expect(popup.locator('#undoList li')).toHaveCount(1);
  await popup.locator('#undoList .undo-btn').click();
  await until(async () => (await ext.tabs()).filter((t) => t.url === url).length === 2);
  await sleep(1000);
  expect((await ext.tabs()).filter((t) => t.url === url)).toHaveLength(2);
  // The restored tab is now marked as kept on purpose.
  await popup.reload();
  await expect(popup.locator('.group .meta', { hasText: 'Kept on purpose' })).toHaveCount(1);
});

test('mode switch in the popup is saved', async ({ context, ext, extId }) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extId}/src/popup/popup.html`);
  await popup.locator('#mode button[data-mode="ask"]').click();
  await expect.poll(() => ext.call(async () => (await chrome.storage.sync.get('settings')).settings?.mode)).toBe('ask');
});

test('options page saves settings and flags invalid patterns', async ({ context, ext, extId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extId}/src/options/options.html`);
  await page.selectOption('#scope', 'window');
  await page.locator('[data-setting="ignoreHash"]').check();
  await page.fill('#whitelist', 'mail.google.com\n/(bad/');
  await expect(page.locator('#whitelistError')).toBeVisible();
  await expect
    .poll(() => ext.call(async () => (await chrome.storage.sync.get('settings')).settings))
    .toMatchObject({ scope: 'window', ignoreHash: true, whitelist: ['mail.google.com', '/(bad/'] });
});
