<div align="center">

<img src="icons/icon-128.png" width="72" alt="" />

# Tab Dedup

**打开重复标签页时自动关闭，并且每次关闭都能撤销。**

Manifest V3 Chrome 扩展。申请的权限很少，不发任何网络请求，没有遥测。

[![CI](https://github.com/silex-ai-lab/silex-tab-dedup/actions/workflows/ci.yml/badge.svg)](https://github.com/silex-ai-lab/silex-tab-dedup/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) · 简体中文

</div>

<p align="center">
  <img src="docs/popup-light.png" width="300" alt="列出重复标签页的弹窗" />
  &nbsp;
  <img src="docs/popup-dark.png" width="300" alt="深色模式下的弹窗" />
</p>

## 为什么用它

- 点开一个链接，却发现这个页面早就在某个标签页里打开了。Tab Dedup 会关掉新开的标签页，并切到原来那个。
- 在一个已经有内容的标签页里点了链接，而目标页面在别处已经打开：这个标签页会**返回上一页**，而不是被关掉，所以它的浏览历史还在。
- 关错了？每次关闭都能在弹窗里撤销，恢复的标签页连同历史记录一起回来。
- `?utm_source=…`、`fbclid`、`www.` 和末尾的 `/` 不会让同一个页面被当成不同的页面。
- 用 Chrome 的「复制标签页」有意复制出来的、刷新的、恢复的标签页，一律不会被关。

## 功能

| | |
| --- | --- |
| **三种模式** | 「关闭」（默认）：关掉重复的标签页；「询问」：弹通知让你选「切过去」或「两个都保留」；「仅标记」：只在图标上计数。 |
| **保留哪个** | 优先保留已固定的标签页，其次是先打开的（也可以改成后打开的）。已固定的标签页永远不会被关。 |
| **弹窗** | 按页面分组列出重复项，有「关闭 N 个重复标签页」按钮，可以单独关闭或跳转到任意一个，下方的「最近关闭」列表带**撤销**。 |
| **快捷键** | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> 关闭所有重复标签页。可以在 `chrome://extensions/shortcuts` 修改。 |
| **匹配规则** | 可忽略追踪参数、`www.`、末尾斜杠、`#` 片段、整个查询字符串或大小写。默认会比较 `#` 片段，因为 Gmail 这类应用靠它区分页面。 |
| **从不视为重复** | 写一个域名（`mail.google.com`）、通配符（`github.com/*/pull/*`）或 `/正则表达式/`。 |
| **范围** | 所有窗口一起查，或每个窗口各查各的。无痕标签页不会和普通标签页互相匹配，也可以完全忽略无痕窗口。 |
| **界面语言** | 英文、简体中文。 |

## 安装

暂未上架 Chrome Web Store，从源码安装：

1. 从 [Releases](https://github.com/silex-ai-lab/silex-tab-dedup/releases) 下载 `silex-tab-dedup-<版本>.zip` 并解压，或者直接 clone 本仓库。
2. 打开 `chrome://extensions`，打开右上角的**开发者模式**。
3. 点击**加载已解压的扩展程序**，选择包含 `manifest.json` 的文件夹。

Edge、Brave、Vivaldi、Opera 也可以用。

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `tabs` | 读取标签页的网址和标题以查找重复；关闭、切换标签页。 |
| `webNavigation` | 知道标签页在什么时候、以什么方式跳转（点链接，还是刷新、前进后退、恢复），只处理新的跳转。 |
| `sessions` | 撤销时连同历史记录一起重新打开标签页。 |
| `storage` | 保存设置（随浏览器账号同步）和撤销列表（只在内存里）。 |
| `notifications` | 「询问」模式，以及可选的「撤销」通知。 |

不申请任何网站访问权限，也不往网页里注入脚本，所以扩展无法读取或修改任何网页的内容。

## 判断流程

1. 某个标签页完成一次跳转。刷新、前进后退、会话恢复和 Chrome 的「复制标签页」都会被忽略。
2. 把网址按上面的匹配规则归一化后，和范围内的其他标签页比较。白名单里的网址、新标签页和还在加载的标签页会被跳过。
3. 如果另一个标签页已经打开了同一个页面，就保留优先的那个：先看是否已固定，其次默认保留先打开的。
4. 关闭刚跳转的那个标签页。如果它之前显示着别的页面，就返回上一页而不是关闭。如果它原本在前台，焦点会切到保留的标签页。

## 开发

```sh
npm install
npm test            # 单元测试（vitest）
npm run test:e2e    # 用 Playwright 把扩展加载进 Chromium 做端到端测试
npm run lint
npm run package     # 生成 dist/silex-tab-dedup-<版本>.zip
```

没有构建步骤：代码是原生 ES modules，可以直接以已解压的方式加载。`src/core/` 是不调用 `chrome.*` 的纯逻辑，方便单元测试；`src/background.js` 是 service worker。界面文字在 `scripts/messages.mjs` 里，修改后运行 `npm run locales`。

路线图以及和其他去重扩展的对比见 [PLAN.md](PLAN.md)。

## 许可证

[MIT](LICENSE) © 2026 Silex AI Lab。功能设计参考了 [Duplicate Tabs Closer](https://github.com/Peuj/duplicate-tabs-closer)（GPL-3.0）、[Tab Options](https://github.com/aghontpi/Tab-Options)（Apache-2.0）和 Clutter Free，没有复制它们的代码。
