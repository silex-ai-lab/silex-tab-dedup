<p align="center">
  <img src="icons/icon-128.png" width="80" height="80" alt="">
</p>

<h1 align="center">Tab Dedup</h1>

<p align="center">
  <strong>Close duplicate tabs as they open, and undo any close.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT"></a>
  <a href="#install"><img src="https://img.shields.io/badge/Manifest-V3-4285F4.svg?style=for-the-badge" alt="Manifest V3"></a>
  <a href="#permissions"><img src="https://img.shields.io/badge/Network-none-2ea44f.svg?style=for-the-badge" alt="Network: none"></a>
  <a href="https://github.com/silex-ai-lab/silex-tab-dedup/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/silex-ai-lab/silex-tab-dedup/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI"></a>
  <a href="https://github.com/silex-ai-lab/silex-tab-dedup/stargazers"><img src="https://img.shields.io/github/stars/silex-ai-lab/silex-tab-dedup?style=for-the-badge" alt="GitHub stars"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> · <a href="#features">Features</a> · <a href="#permissions">Permissions</a> · <a href="#how-it-decides">How it decides</a>
  <br>
  English · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

---

A Manifest V3 Chrome extension. It asks for few permissions, makes no network requests and sends no telemetry. Open source (MIT).

<p align="center">
  <img src="docs/popup-light.png" width="260" alt="Popup listing duplicate tabs">
  &nbsp;
  <img src="docs/popup-search-light.png" width="260" alt="Quick search over open tabs">
  &nbsp;
  <img src="docs/popup-dark.png" width="260" alt="The popup in dark mode">
</p>

> ⭐ **Star this repo** to follow new features and fixes. When Chrome changes something the extension relies on, I fix it so you don't have to. [Why star it →](#-why-star-tab-dedup)

## Why Tab Dedup?

- 🔁 **The page is already open in a tab you forgot about** → Tab Dedup closes the new tab and switches you to the one you already had.
- ↩️ **You clicked a link in a tab that was already showing a page** → if the link leads to a page open elsewhere, that tab goes **back** to where it was instead of closing, so its history is kept.
- 🧯 **You closed the wrong one** → every close can be undone from the popup, and the tab comes back with its history.
- 🧹 **The same page, with different junk in the URL** → `?utm_source=…`, `fbclid`, `www.` and a trailing `/` do not make a page different.
- 🛡️ **You meant to have two copies** → tabs you duplicate on purpose with Chrome's **Duplicate** command, reloads and restored tabs are never closed.

### ✅ Before you install

| | |
|---|---|
| 💰 **Free and open source** | MIT licence. |
| 🔒 **No network** | No network requests, no telemetry, no account. |
| 🧩 **No host permissions** | No content scripts: the extension cannot read or change what is on any page. See [Permissions](#permissions). |
| ↩️ **Undo** | Every close can be undone from the popup. |
| 🧪 **Tested in CI** | Unit tests for the matching logic, and end-to-end tests that load the extension into Chromium. See [Browsers](#browsers). |
| ⚠️ **Not on the Chrome Web Store yet** | Install from source or from a release zip with **Load unpacked**; see [Install](#install). |

## Browsers

| Browser | Status |
|---|---|
| Chromium | The end-to-end tests run here, in CI on every push. |
| Google Chrome 116+ | The extension's minimum version. Install with **Load unpacked**. Not covered by the automated tests: recent branded Chrome does not let a test runner load an unpacked extension. |
| Edge, Brave, Vivaldi, Opera | Chromium-based. Expected to work the same way, not tested. |

## Features

| | |
| --- | --- |
| **Three modes** | *Close* (default) closes the duplicate; *Ask* shows a notification with *Switch* / *Keep both*; *Only flag* just counts duplicates on the badge. |
| **Which tab stays** | Pinned tabs first, then the older tab (or the newer one, if you prefer). Pinned tabs are never closed. |
| **Popup** | Duplicates grouped by page, *Close N duplicates* button, close or jump to any tab, and a *Recently closed* list with **Undo**. |
| **Quick search** | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> opens the popup with the cursor in the search box. Type a few words, use <kbd>↑</kbd> <kbd>↓</kbd>, and press <kbd>Enter</kbd> to switch to that tab. |
| **All tabs by site** | Every open tab grouped by site, biggest first. Close a whole site in one click, and undo it in one click. |
| **Sessions** | Save this window or all windows, optionally closing the tabs. Restoring reopens each saved window but skips pages that are already open. Rename sessions, remove single tabs, and export them as JSON or as a bookmarks HTML file that any browser can import. Import accepts our JSON, bookmark files, Tab Options exports or a plain list of URLs. |
| **Shortcuts** | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> closes every duplicate. You can change both shortcuts at `chrome://extensions/shortcuts`. |
| **Matching** | Ignore tracking parameters, `www.`, trailing slash, `#fragment`, the whole query string, or case. The fragment is compared by default, because apps like Gmail route on it. |
| **Never treat as duplicates** | A domain (`mail.google.com`), a glob (`github.com/*/pull/*`) or a `/regular expression/`. |
| **Advanced matching** | *Treat as one page* rules (for example `youtube.com/watch*`), *sites with several domains* (`yandex.*`), and optional same-title matching for the popup and the shortcut. |
| **Backup** | Settings sync through your browser account. They can also be exported to a JSON file, imported, or reset. |
| **Scope** | Across all windows or within each window. Incognito tabs are never matched with normal ones and can be ignored entirely. |
| **Languages** | English and Simplified Chinese. |

## Quick start

### Install

Not on the Chrome Web Store yet. Install from source:

1. Download `silex-tab-dedup-<version>.zip` from [Releases](https://github.com/silex-ai-lab/silex-tab-dedup/releases) and unzip it, or clone this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the folder that contains `manifest.json`.

To update a clone, run `git pull`, then click the reload button ↻ on the extension's card in `chrome://extensions`.

### Your first two minutes

1. Open any page, then open the same page again in a new tab. The new tab closes and you are back on the first one.
2. Click the toolbar icon. Under *Recently closed*, click **Undo**: the tab comes back.
3. Press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>, type a few words from a tab's title, and press <kbd>Enter</kbd>.

## Permissions

| Permission | Why |
| --- | --- |
| `tabs` | Read tab URLs and titles to find duplicates; close and focus tabs. |
| `webNavigation` | Know when a tab navigates and how (a link vs. a reload, back/forward or restore), so that only new navigations are acted on. |
| `sessions` | Undo: reopen a closed tab with its history. |
| `storage` | Keep your settings (synced through your browser account), saved sessions (this browser only) and the undo list (in memory only). |
| `notifications` | *Ask* mode and the optional *Undo* notification. |
| `favicon` | Show site icons in the popup and on the sessions page, from Chrome's own cache. |

No host permissions and no content scripts: the extension cannot read or change what is on any page.

## How it decides

1. A tab commits a navigation. Reloads, back/forward, session restore and Chrome's **Duplicate** command are ignored.
2. The URL is normalized (see *Matching*) and compared with the other tabs in scope. Whitelisted URLs, new-tab pages and tabs that are still loading are skipped.
3. If another tab already shows the page, the preferred tab is kept: pinned first, then the older tab by default.
4. The tab that navigated is closed. If it was showing another page before, it goes back to that page instead of closing. Focus moves to the kept tab if the closed one was in front.

## Design principles

- **Acts only on what you just opened.** Only the tab that navigated is closed or sent back; duplicates elsewhere are left for the popup and the shortcut.
- **Every close can be undone.** The popup's *Recently closed* list reopens a tab with its history.
- **Reads tabs, not pages.** No host permissions and no content scripts, so it never sees what is on a page.

## ⭐ Why star Tab Dedup

I use Tab Dedup every day, so I keep maintaining it.

- When people ask for a feature or a matching rule, I add it.
- I keep it **free, local and small**: no account, no paid tier, nothing sent anywhere, no host permissions.
- When Chrome changes an API the extension relies on, I fix it so you don't have to watch for it.

More reasons:

- 🧪 **Tested, not just described.** CI runs the unit tests and loads the extension into Chromium for end-to-end tests on every push.
- ↩️ **Nothing is lost.** Every close, including closing a whole site, can be undone from the popup.
- 🔒 **Few permissions.** The [Permissions](#permissions) table says why each one is needed.
- 🌏 **Readable in four languages:** this README is in English, 简体中文, 日本語 and 한국어; the extension's own UI is in English and Simplified Chinese.
- 📣 **Helps other people find it.** A star makes Tab Dedup easier to find for anyone else drowning in tabs.

Star it so you can find it again the next time you have three copies of the same page open. ⭐

## Develop

```sh
npm install
npm test            # unit tests (vitest)
npm run test:e2e    # loads the extension into Chromium with Playwright
npm run lint
npm run package     # dist/silex-tab-dedup-<version>.zip
```

The code has no build step: plain ES modules, loadable unpacked as-is. `src/core/` is pure logic with no `chrome.*` calls, which keeps it unit-testable. `src/background.js` is the service worker. UI strings live in `scripts/messages.mjs`; run `npm run locales` after editing them.

The roadmap and the comparison with other duplicate-tab extensions are in [PLAN.md](PLAN.md).

## License

[MIT](LICENSE) © 2026 Silex AI Lab. Behaviour was informed by [Duplicate Tabs Closer](https://github.com/Peuj/duplicate-tabs-closer) (GPL-3.0), [Tab Options](https://github.com/aghontpi/Tab-Options) (Apache-2.0) and Clutter Free. No code was copied from them.
