# Chrome Web Store listing

Source of truth for what is entered in the developer dashboard. Keep it in sync with README.md.

## Summary (from manifest `extDescription`, max 132 characters)

Closes duplicate tabs as they open and switches you to the tab you already had. Undo any close. No data leaves your browser.

## Description (English)

Tab Dedup closes a duplicate tab the moment it opens and switches you to the tab you already had. Every close can be undone.

WHAT IT DOES
• Open a page that is already open in another tab: the new tab closes and you are taken to the existing one.
• Click a link in a tab that was already showing a page: if the link leads to a page open elsewhere, that tab goes back instead of closing, so its history is kept.
• Closed the wrong one? Undo it from the popup; the tab comes back with its history.
• Tracking parameters (utm_*, fbclid, gclid …), "www." and a trailing slash do not make a page different.
• Tabs you duplicate on purpose with Chrome's Duplicate command, reloads and restored tabs are never closed.

MORE
• Three modes: Close (default), Ask with a notification, or only count duplicates on the badge.
• Pinned tabs are kept first and are never closed.
• Quick search: Alt+Shift+F opens the popup with the cursor in the search box.
• All tabs grouped by site; close a whole site in one click, undo in one click.
• Sessions: save this window or all windows, restore without reopening pages that are already open, export to JSON or bookmarks HTML, import bookmark files or URL lists.
• Alt+Shift+D closes every duplicate.
• Whitelist, "treat as one page" rules, sites with several domains, optional same-title matching.
• English and Simplified Chinese.

PRIVACY
No network requests, no telemetry, no account. No host permissions and no content scripts: the extension cannot read or change what is on any page. Settings and saved sessions stay in your browser.

Open source (MIT): https://github.com/silex-ai-lab/silex-tab-dedup

## Description (简体中文)

Tab Dedup 在重复标签页打开的一瞬间把它关掉，并切到你原来那个标签页。每次关闭都能撤销。

功能
• 打开一个已经在别的标签页里开着的页面：新标签页会关闭，并切到已有的那个。
• 在已有内容的标签页里点了链接，而目标页面在别处已经打开：这个标签页会返回上一页，而不是被关掉，浏览历史得以保留。
• 关错了？在弹窗里撤销，标签页连同历史记录一起回来。
• 追踪参数（utm_*、fbclid、gclid 等）、「www.」和末尾斜杠不会让同一个页面被当成不同页面。
• 用 Chrome「复制标签页」有意复制的、刷新的、恢复的标签页，一律不会被关。

更多
• 三种模式：关闭（默认）、用通知询问、只在图标上计数。
• 优先保留已固定的标签页，已固定的标签页永远不会被关。
• 快速搜索：Alt+Shift+F 打开弹窗，光标直接在搜索框里。
• 按网站查看全部标签页，一键关闭整个网站，一键撤销。
• 会话：保存当前窗口或全部窗口，恢复时跳过已经打开的页面，可导出为 JSON 或书签 HTML，可导入书签文件或网址列表。
• Alt+Shift+D 关闭所有重复标签页。
• 白名单、「视为同一个页面」规则、多域名网站、可选的按标题匹配。
• 界面支持英文和简体中文。

隐私
不发网络请求，没有遥测，不需要账号。不申请网站访问权限，也不注入脚本：扩展无法读取或修改任何网页的内容。设置和会话只保存在你的浏览器里。

开源（MIT）：https://github.com/silex-ai-lab/silex-tab-dedup

## Category

Tools (Workflow & Planning if offered)

## Single purpose

Find and close duplicate browser tabs, and help the user manage open tabs (search, group by site, save and restore sessions).

## Permission justifications

- tabs: Read the URL and title of open tabs to detect duplicates, and close or focus tabs.
- webNavigation: Detect when a tab navigates and whether it was a link, a reload, back/forward or a restore, so only new navigations are checked and reloads or restored tabs are never closed.
- sessions: Undo: reopen a closed tab with its history via chrome.sessions.restore.
- storage: Store the user's settings, saved sessions and the undo list locally.
- notifications: "Ask" mode asks the user with a notification whether to close a duplicate; optional undo notification after an automatic close.
- favicon: Show site icons next to tabs in the popup and on the sessions page, from Chrome's favicon cache.
- Remote code: No. All code is packaged in the extension.

## Data usage

Collects no user data. Certify: not sold, not used for unrelated purposes, not used for creditworthiness.

## Privacy policy URL

https://github.com/silex-ai-lab/silex-tab-dedup/blob/main/PRIVACY.md
