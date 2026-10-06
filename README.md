<div align="center">

<img src="icons/icon-128.png" width="72" alt="" />

# Tab Dedup

**Close duplicate tabs as they open, and undo any close.**

A Manifest V3 Chrome extension. It asks for few permissions, makes no network requests and sends no telemetry.

[![CI](https://github.com/silex-ai-lab/silex-tab-dedup/actions/workflows/ci.yml/badge.svg)](https://github.com/silex-ai-lab/silex-tab-dedup/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

English · [简体中文](README.zh-CN.md)

</div>

<p align="center">
  <img src="docs/popup-light.png" width="260" alt="Popup listing duplicate tabs" />
  &nbsp;
  <img src="docs/popup-search-light.png" width="260" alt="Quick search over open tabs" />
  &nbsp;
  <img src="docs/popup-dark.png" width="260" alt="The popup in dark mode" />
</p>

## Why

- You open a link and the page is already open in a tab you forgot about. Tab Dedup closes the new tab and switches you to the one you already had.
- You click a link inside a tab that is already showing a page. If the link leads to a page open elsewhere, that tab goes **back** to where it was instead of closing, so its history is kept.
- Closed the wrong one? Every close can be undone from the popup, and the tab comes back with its history.
- `?utm_source=…`, `fbclid`, `www.` and a trailing `/` do not make a page different.
- Tabs you duplicate on purpose with Chrome's **Duplicate** command, reloads and restored tabs are never closed.

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

## Install

Not on the Chrome Web Store yet. Install from source:

1. Download `silex-tab-dedup-<version>.zip` from [Releases](https://github.com/silex-ai-lab/silex-tab-dedup/releases) and unzip it, or clone this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the folder that contains `manifest.json`.

It also works in Edge, Brave, Vivaldi and Opera.

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
