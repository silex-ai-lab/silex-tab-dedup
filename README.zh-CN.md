<p align="center">
  <img src="icons/icon-128.png" width="80" height="80" alt="">
</p>

<h1 align="center">Tab Dedup</h1>

<p align="center">
  <strong>打开重复标签页时自动关闭，并且每次关闭都能撤销。</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT"></a>
  <a href="#安装"><img src="https://img.shields.io/badge/Manifest-V3-4285F4.svg?style=for-the-badge" alt="Manifest V3"></a>
  <a href="#权限说明"><img src="https://img.shields.io/badge/Network-none-2ea44f.svg?style=for-the-badge" alt="Network: none"></a>
  <a href="https://github.com/silex-ai-lab/silex-tab-dedup/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/silex-ai-lab/silex-tab-dedup/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI"></a>
  <a href="https://github.com/silex-ai-lab/silex-tab-dedup/stargazers"><img src="https://img.shields.io/github/stars/silex-ai-lab/silex-tab-dedup?style=for-the-badge" alt="GitHub stars"></a>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> · <a href="#功能">功能</a> · <a href="#权限说明">权限说明</a> · <a href="#判断流程">判断流程</a>
  <br>
  <a href="README.md">English</a> · 简体中文 · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

---

<sub>英文版 README 为权威版本，本译文可能滞后。</sub>

Manifest V3 Chrome 扩展。申请的权限很少，不发任何网络请求，没有遥测。开源（MIT）。

<p align="center">
  <img src="docs/popup-light.png" width="260" alt="Popup listing duplicate tabs">
  &nbsp;
  <img src="docs/popup-search-light.png" width="260" alt="Quick search over open tabs">
  &nbsp;
  <img src="docs/popup-dark.png" width="260" alt="The popup in dark mode">
</p>

> ⭐ **给仓库点个 Star**，关注新功能和修复。Chrome 改动了扩展依赖的东西时，我会修好，你不用操心。[为什么值得 Star →](#-为什么值得-star)

## 为什么用 Tab Dedup？

- 🔁 **页面其实早就在某个被你忘掉的标签页里开着** → Tab Dedup 关掉新开的标签页，切回你原来那个。
- ↩️ **你在一个已经有内容的标签页里点了链接** → 如果目标页面在别处已经打开，这个标签页会**返回上一页**，而不是被关掉，所以它的浏览历史还在。
- 🧯 **关错了** → 每次关闭都能在弹窗里撤销，恢复的标签页连同历史记录一起回来。
- 🧹 **同一个页面，网址里多了些杂七杂八的东西** → `?utm_source=…`、`fbclid`、`www.` 和末尾的 `/` 不会让同一个页面被当成不同的页面。
- 🛡️ **你本来就想要两份** → 用 Chrome 的「复制标签页」（**Duplicate**）有意复制出来的、刷新的、恢复的标签页，一律不会被关。

### ✅ 安装前须知

| | |
|---|---|
| 💰 **免费开源** | MIT 许可证。 |
| 🔒 **不联网** | 不发网络请求，没有遥测，不需要账号。 |
| 🧩 **不申请网站访问权限** | 不注入任何脚本：扩展无法读取或修改任何网页的内容。见[权限说明](#权限说明)。 |
| ↩️ **可撤销** | 每次关闭都能在弹窗里撤销。 |
| 🧪 **CI 自动测试** | 匹配逻辑有单元测试，另有把扩展加载进 Chromium 的端到端测试。见[浏览器](#浏览器)。 |
| ⚠️ **暂未上架 Chrome Web Store** | 从源码或 Release 里的 zip 用「加载已解压的扩展程序」（**Load unpacked**）安装，见[安装](#安装)。 |

## 浏览器

| 浏览器 | 状态 |
|---|---|
| Chromium | 端到端测试在这里跑，每次 push 都会在 CI 里运行。 |
| Google Chrome 116+ | 扩展要求的最低版本。用「加载已解压的扩展程序」安装。自动测试覆盖不到：新版正式版 Chrome 不允许测试工具加载已解压的扩展。 |
| Edge, Brave, Vivaldi, Opera | 基于 Chromium，预计用法相同，未测试。 |

## 功能

| | |
| --- | --- |
| **三种模式** | 「关闭」（默认）：关掉重复的标签页；「询问」：弹通知让你选「切过去」或「两个都保留」；「仅标记」：只在图标上计数。 |
| **保留哪个** | 优先保留已固定的标签页，其次是先打开的（也可以改成后打开的）。已固定的标签页永远不会被关。 |
| **弹窗** | 按页面分组列出重复项，有「关闭 N 个重复标签页」按钮，可以单独关闭或跳转到任意一个，下方的「最近关闭」列表带**撤销**。 |
| **快速搜索** | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> 打开弹窗，光标直接在搜索框里。输入几个词，用 <kbd>↑</kbd> <kbd>↓</kbd> 选择，按 <kbd>Enter</kbd> 切到那个标签页。 |
| **按网站查看全部标签页** | 所有已打开的标签页按网站分组，标签页最多的排在前面。可以一键关闭整个网站的标签页，也能一键撤销。 |
| **会话** | 保存当前窗口或全部窗口，可选择保存后关闭。恢复时按原来的窗口重新打开，但已经开着的页面不会再开一次。可以重命名会话、移除单个标签页，也可以导出为 JSON 或任何浏览器都能导入的书签 HTML。导入支持本扩展的 JSON、书签文件、Tab Options 导出文件或一份网址列表。 |
| **快捷键** | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> 关闭所有重复标签页。两个快捷键都可以在 `chrome://extensions/shortcuts` 修改。 |
| **匹配规则** | 可忽略追踪参数、`www.`、末尾斜杠、`#fragment`、整个查询字符串或大小写。默认会比较 `#` 片段，因为 Gmail 这类应用靠它区分页面。 |
| **从不视为重复** | 写一个域名（`mail.google.com`）、通配符（`github.com/*/pull/*`）或 `/regular expression/`（正则表达式）。 |
| **高级匹配** | 「视为同一个页面」规则（例如 `youtube.com/watch*`）、「有多个域名的网站」（`yandex.*`），以及可选的按标题匹配（只用于弹窗和快捷键）。 |
| **备份** | 设置随浏览器账号同步，也可以导出为 JSON 文件、导入或恢复默认。 |
| **范围** | 所有窗口一起查，或每个窗口各查各的。无痕标签页不会和普通标签页互相匹配，也可以完全忽略无痕窗口。 |
| **界面语言** | 英文、简体中文。 |

## 快速开始

### 安装

暂未上架 Chrome Web Store，从源码安装：

1. 从 [Releases](https://github.com/silex-ai-lab/silex-tab-dedup/releases) 下载 `silex-tab-dedup-<version>.zip` 并解压，或者直接 clone 本仓库。
2. 打开 `chrome://extensions`，打开右上角的**开发者模式**（Developer mode）。
3. 点击**加载已解压的扩展程序**（Load unpacked），选择包含 `manifest.json` 的文件夹。

更新 clone 下来的代码：运行 `git pull`，然后在 `chrome://extensions` 里点扩展卡片上的刷新按钮 ↻。

### 上手两分钟

1. 随便打开一个网页，再在新标签页里打开同一个网页。新标签页会被关掉，你回到第一个标签页。
2. 点工具栏图标，在「最近关闭」下点**撤销**：那个标签页回来了。
3. 按 <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>，输入某个标签页标题里的几个词，按 <kbd>Enter</kbd>。

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `tabs` | 读取标签页的网址和标题以查找重复；关闭、切换标签页。 |
| `webNavigation` | 知道标签页在什么时候、以什么方式跳转（点链接，还是刷新、前进后退、恢复），只处理新的跳转。 |
| `sessions` | 撤销时连同历史记录一起重新打开标签页。 |
| `storage` | 保存设置（随浏览器账号同步）、已保存的会话（只在这个浏览器里）和撤销列表（只在内存里）。 |
| `notifications` | 「询问」模式，以及可选的「撤销」通知。 |
| `favicon` | 在弹窗和会话页面显示网站图标，图标来自 Chrome 自己的缓存。 |

不申请任何网站访问权限，也不往网页里注入脚本，所以扩展无法读取或修改任何网页的内容。

## 判断流程

1. 某个标签页完成一次跳转。刷新、前进后退、会话恢复和 Chrome 的「复制标签页」都会被忽略。
2. 把网址按上面的匹配规则归一化后，和范围内的其他标签页比较。白名单里的网址、新标签页和还在加载的标签页会被跳过。
3. 如果另一个标签页已经打开了同一个页面，就保留优先的那个：先看是否已固定，其次默认保留先打开的。
4. 关闭刚跳转的那个标签页。如果它之前显示着别的页面，就返回上一页而不是关闭。如果它原本在前台，焦点会切到保留的标签页。

## 设计原则

- **只处理你刚打开的。** 只有刚跳转的那个标签页会被关闭或返回上一页；别处已有的重复项留给弹窗和快捷键处理。
- **每次关闭都能撤销。** 弹窗里的「最近关闭」列表会连同历史记录一起重新打开标签页。
- **只看标签页，不看网页内容。** 不申请网站访问权限，也不注入脚本，所以它看不到任何网页上的内容。

## ⭐ 为什么值得 Star

我每天都在用 Tab Dedup，所以会一直维护它。

- 有人提需要的功能或匹配规则，我就加上。
- 保持**免费、本地、轻量**：不需要账号，没有付费版，不往外发任何东西，不申请网站访问权限。
- Chrome 改动了扩展依赖的 API，我会修好，你不用盯着。

更多理由：

- 🧪 **真的测过，不只是写在文档里。** 每次 push，CI 都会跑单元测试，并把扩展加载进 Chromium 做端到端测试。
- ↩️ **什么都不会丢。** 每次关闭，包括一键关闭整个网站，都能在弹窗里撤销。
- 🔒 **权限很少。** [权限说明](#权限说明)表格写明了每个权限为什么需要。
- 🌏 **四种语言的文档：** 本 README 有 English、简体中文、日本語和한국어版本；扩展界面本身是英文和简体中文。
- 📣 **帮别人找到它。** Star 能让其他被标签页淹没的人更容易找到 Tab Dedup。

点个 Star，下次又开了三份同样的页面时，就能再找到它。⭐

## 开发

```sh
npm install
npm test            # unit tests (vitest)
npm run test:e2e    # loads the extension into Chromium with Playwright
npm run lint
npm run package     # dist/silex-tab-dedup-<version>.zip
```

没有构建步骤：代码是原生 ES modules，可以直接以已解压的方式加载。`src/core/` 是不调用 `chrome.*` 的纯逻辑，方便单元测试；`src/background.js` 是 service worker。界面文字在 `scripts/messages.mjs` 里，修改后运行 `npm run locales`。

路线图以及和其他去重扩展的对比见 [PLAN.md](PLAN.md)。

## 许可证

[MIT](LICENSE) © 2026 Silex AI Lab。功能设计参考了 [Duplicate Tabs Closer](https://github.com/Peuj/duplicate-tabs-closer)（GPL-3.0）、[Tab Options](https://github.com/aghontpi/Tab-Options)（Apache-2.0）和 Clutter Free，没有复制它们的代码。
