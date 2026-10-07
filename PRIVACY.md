# Privacy policy: Tab Dedup

*Last updated: 2026-10-06*

Tab Dedup is a browser extension published by Silex AI Lab. This policy covers the extension as published on the Chrome Web Store and in this repository.

## What it collects

Nothing. Tab Dedup does not collect, transmit, sell or share any personal data or browsing data. It makes no network requests, has no analytics or telemetry, and has no account.

## What it stores, and where

Everything stays in your browser:

| Data | Where | Why |
| --- | --- | --- |
| Your settings | `chrome.storage.sync`, synced by your browser through your own browser account if you have sync turned on | So your settings follow you |
| Saved sessions (URLs and titles of tabs you chose to save) | `chrome.storage.local`, this browser only | So you can restore them later |
| The undo list and per-tab navigation state | `chrome.storage.session`, in memory, cleared when the browser closes | Undo and duplicate detection |

You can delete saved sessions from the extension's sessions page, reset settings from its options page, and remove all of it by uninstalling the extension.

## What it reads

The extension reads the URL and title of your open tabs, and whether a navigation was a link, a reload or back/forward, in order to find and close duplicate tabs. It has no host permissions and no content scripts, so it cannot read or change what is on any web page.

## Contact

Questions: open an issue at https://github.com/silex-ai-lab/silex-tab-dedup/issues
