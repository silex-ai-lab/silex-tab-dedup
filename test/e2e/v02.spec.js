import { expect, test, until } from './fixtures.js';

const popupUrl = (extId) => `chrome-extension://${extId}/src/popup/popup.html`;

test('quick search finds a tab and Enter switches to it', async ({ context, ext, extId, server }) => {
  await ext.settings({ mode: 'off' });
  const target = await ext.open(server.url('docs.test', '/Quarterly-report'), { active: false });
  await ext.open(server.url('news.test', '/Weather'));
  await until(async () => (await ext.tabs()).find((t) => t.id === target)?.url?.includes('Quarterly'));
  await new Promise((r) => setTimeout(r, 300));

  const popup = await context.newPage();
  await popup.goto(popupUrl(extId));
  await expect(popup.locator('#search')).toBeFocused();
  await popup.locator('#search').fill('quarter rep');
  await expect(popup.locator('#results .tab')).toHaveCount(1);
  await expect(popup.locator('#view-dupes')).toBeHidden();
  await popup.keyboard.press('Enter');
  await expect.poll(async () => (await ext.tabs()).find((t) => t.id === target)?.active).toBe(true);
});

test('All tabs view groups by site and closes a whole site', async ({ context, ext, extId, server }) => {
  await ext.settings({ mode: 'off' });
  for (const p of ['/1', '/2', '/3']) await ext.open(server.url('www.big.test', p));
  await ext.open(server.url('small.test', '/x'));
  await until(async () => (await ext.tabs()).filter((t) => t.url.includes('big.test')).length === 3);

  const popup = await context.newPage();
  await popup.goto(popupUrl(extId));
  await popup.locator('nav button[data-view="all"]').click();
  const first = popup.locator('#domains .group').first();
  await expect(first.locator('.host')).toHaveText('big.test');
  await first.locator('.close-group').click();
  await expect.poll(async () => (await ext.tabs()).filter((t) => t.url.includes('big.test')).length).toBe(0);
  // Undo brings the whole site back as one action.
  await popup.locator('nav button[data-view="dupes"]').click();
  await popup.locator('#undoList button').first().click();
  await expect.poll(async () => (await ext.tabs()).filter((t) => t.url.includes('big.test')).length).toBe(3);
});

test('save a window as a session, close it, and restore without duplicating', async ({ context, ext, extId, server }) => {
  const urls = ['/one', '/two', '/three'].map((p) => server.url('s.test', p));
  const win = await ext.call(async (urls) => (await chrome.windows.create({ url: urls })).id, urls);
  await until(async () => (await ext.tabs()).filter((t) => t.windowId === win && t.url.startsWith('http')).length === 3);
  await new Promise((r) => setTimeout(r, 300));

  const popup = await context.newPage();
  await popup.goto(popupUrl(extId));
  const saved = await popup.evaluate(async (windowId) => {
    const res = await chrome.runtime.sendMessage({ type: 'saveSession', scope: 'window', windowId, close: true });
    return res.result;
  }, win);
  expect(saved.windows[0].tabs.map((t) => t.url)).toEqual(urls);
  await expect.poll(async () => (await ext.tabs()).filter((t) => urls.includes(t.url)).length).toBe(0);

  await popup.locator('nav button[data-view="sessions"]').click();
  await expect(popup.locator('#sessions .session')).toHaveCount(1);

  // Reopen one page by hand, then restore: that page is not opened a second time.
  await ext.open(urls[0]);
  await until(async () => (await ext.tabs()).some((t) => t.url === urls[0]));
  const result = await popup.evaluate(async (id) => (await chrome.runtime.sendMessage({ type: 'restoreSession', id })).result, saved.id);
  expect(result).toEqual({ opened: 2, skipped: 1 });
  await expect.poll(async () => (await ext.tabs()).filter((t) => urls.includes(t.url)).length).toBe(3);
});

test('sessions page imports a URL list and exports JSON', async ({ context, extId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extId}/src/sessions/sessions.html`);
  await expect(page.locator('#none')).toBeVisible();
  await page.setInputFiles('#importFile', {
    name: 'reading-list.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('https://example.com/a\nhttps://example.org/b\n'),
  });
  await expect(page.locator('.session')).toHaveCount(1);
  await expect(page.locator('.session .name')).toHaveValue('reading-list');
  await expect(page.locator('.window li')).toHaveCount(2);

  await page.locator('.session .name').fill('Reading');
  await page.locator('.session .name').press('Enter');
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#exportJson').click()]);
  const text = await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString());
  const data = JSON.parse(text);
  expect(data.sessions[0].name).toBe('Reading');
  expect(data.sessions[0].windows[0].tabs.map((t) => t.url)).toEqual(['https://example.com/a', 'https://example.org/b']);

  await page.locator('.window li .remove').first().click();
  await expect(page.locator('.window li')).toHaveCount(1);
  await page.locator('.session .delete').click();
  await expect(page.locator('#none')).toBeVisible();
});

test('options page saves advanced rules and imports settings', async ({ context, ext, extId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extId}/src/options/options.html`);
  await page.locator('[data-list="groupRules"]').fill('youtube.com/watch*');
  await page.locator('[data-list="hostAliases"]').fill('yandex.*');
  await page.locator('[data-setting="matchTitle"]').check();
  await expect
    .poll(() => ext.call(async () => (await chrome.storage.sync.get('settings')).settings))
    .toMatchObject({ groupRules: ['youtube.com/watch*'], hostAliases: ['yandex.*'], matchTitle: true });

  await page.setInputFiles('#importSettings', {
    name: 's.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ mode: 'ask', scope: 'window', bogus: true })),
  });
  await expect(page.locator('#mode')).toHaveValue('ask');
  await expect
    .poll(() => ext.call(async () => (await chrome.storage.sync.get('settings')).settings))
    .toMatchObject({ mode: 'ask', scope: 'window', groupRules: [] });
});
