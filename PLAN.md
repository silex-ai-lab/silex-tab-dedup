# silex-tab-dedup — 开发计划

一个 Manifest V3 的 Chrome 扩展：发现并关闭重复标签页。综合三款参考扩展的优点，只用最少权限，不联网，不收集数据。

## 1. 参考扩展调研（2026-10-06）

| 扩展 | 是否开源 / 许可证 | 现状 | 值得借鉴 | 不足 |
| --- | --- | --- | --- | --- |
| **Clutter Free** | 闭源 | 在架，适配 MV3 | 打开重复页时直接拦截（切到已有标签并关掉新开的）；快速标签页搜索；重复列表一键清理；白名单/黑名单 | 代码不可见，只能参考行为 |
| **Peuj/duplicate-tabs-closer** | 开源，**GPL-3.0**，228★ | **仍在维护**：v4.3.4，最近提交 2026-10-05，20 个未关 issue。之前说它"维护停滞"，这个说法已经过时 | 规则体系最完整：URL 归一化开关（大小写 / www / hash / query / 只比域名），按标题相似度匹配，URL Group / Normalize 规则（`*` 通配或 `/regex/`），保留哪个标签的优先级链（固定 > 活动 > HTTPS > 新旧 > 活动窗口），检测范围（当前窗口 / 全部窗口），"有意复制"保护（不会关掉用户手动「复制标签页」开出的标签），徽章计数，弹窗里的重复列表 | 选项太多，新用户上手难；GPL 许可证会传染 |
| **aghontpi/Tab-Options** | 开源，Apache-2.0，7★ | 最近提交 2026-06 | 实时徽章计数；发现重复时弹提示让用户选「切换并关闭 / 保留」；全部标签面板；按域名分组；会话保存 / 导出 / 导入 | 弹提示需要往页面里注入脚本，因此要申请所有网站的访问权限 |

**许可证约束**：Peuj 的代码是 GPL-3.0。本项目用 MIT，**只参考它的功能和行为，不复制代码**（clean-room 实现）。Tab-Options 是 Apache-2.0，可以借鉴实现思路，但同样不直接搬代码。

## 2. 产品定位

**默认就能用、默认就安全。** 装上以后不用配置，打开重复页时自动切到已有标签。高级规则放在设置页里，平时不出现。

设计原则：
1. **最少权限**：只申请 `tabs`、`storage`、`sessions`、`webNavigation`，不申请任何网站访问权限（host permissions），所以安装时不会出现"可读取和更改您在所有网站上的数据"。
2. **可撤销**：每次自动关闭都能一键撤销（用 `chrome.sessions.restore`）。三款参考扩展都没有撤销功能，这是我们的差异点。
3. **不联网、无遥测**：所有数据都存在 `chrome.storage` 里，只保存在本机。
4. **能测试**：判重逻辑写成不依赖浏览器 API 的纯函数，单元测试覆盖。

## 3. 功能范围

### v0.1 — MVP

| 功能 | 来源 |
| --- | --- |
| 打开重复页时拦截：可选「关闭」「询问」或「只标记」三种模式，默认关闭重复页并切到已有标签 | Clutter Free / Peuj |
| 「询问」模式用 `chrome.notifications` 系统通知提供「切换 / 保留」按钮，不往页面注入脚本 | 改进 Tab-Options 的弹提示（省掉网站访问权限） |
| 保留哪个标签的优先级：固定标签 > 活动标签 > HTTPS > 较早打开的 | Peuj |
| URL 归一化：忽略 hash（默认开）、忽略 `www`、忽略大小写、忽略 query，另有内置的追踪参数黑名单（`utm_*`、`fbclid`、`gclid` 等） | Peuj + 新增 |
| 检测范围：当前窗口 / 全部窗口（默认全部），可选跳过无痕窗口 | Peuj |
| 白名单：域名或 URL 用 `*` 通配，也可写 `/regex/` | Clutter Free / Peuj |
| 徽章：显示当前重复标签数 | Peuj / Tab-Options |
| 弹窗：按组列出重复标签，可「全部清理」，也可逐个关闭 | 全部三款 |
| 撤销：弹窗里显示最近 N 次自动关闭，可一键恢复；关闭后的通知里也有「撤销」按钮 | **新增** |
| 快捷键：`Alt+Shift+D` 清理所有重复标签 | 新增 |
| 有意复制保护：用户通过「复制标签页」开出的标签不会被自动关闭 | Peuj |
| 界面语言：英文、简体中文 | — |

### v0.2

- 快速标签页搜索：弹窗顶部加搜索框，按标题或 URL 模糊匹配，回车切换过去，并配一个快捷键（来自 Clutter Free）
- 按域名分组查看所有标签（来自 Tab-Options）
- URL Group / Normalize 规则（例如 `youtube.com/watch*`、`yandex.*`）以及按标题匹配（来自 Peuj）
- 设置的导入和导出（JSON）

### v0.3（待定）

- 会话保存、恢复和导出（Tab-Options 的核心功能）。这已经超出了"去重"的范围，等 v0.2 发布后再决定做不做。
- Firefox 版本

**明确不做**：云同步、账号、统计上报、往页面注入 content script。

## 4. 技术方案

```
silex-tab-dedup/
├── manifest.json            # MV3, service_worker: src/background.js (type: module)
├── src/
│   ├── core/                # 纯函数，不调用 chrome.*，可直接单测
│   │   ├── normalize.js     # URL → 比较键
│   │   ├── patterns.js      # 通配符 / regex 编译与匹配
│   │   ├── groups.js        # tabs[] → 重复组
│   │   └── priority.js      # 组内选出保留的那个
│   ├── background.js        # 事件监听、关闭、徽章、通知、撤销栈
│   ├── settings.js          # 默认值 + chrome.storage.sync 读写 + 迁移
│   ├── popup/               # 重复列表、撤销、(v0.2) 搜索
│   └── options/             # 设置页
├── _locales/{en,zh_CN}/messages.json
├── test/unit/               # vitest
├── test/e2e/                # Playwright 加载 unpacked 扩展
└── .github/workflows/       # lint + test + 打包 zip
```

- **不引入构建步骤**：原生 ES modules + JSDoc 类型注释，加载 unpacked 就能直接调试。npm 依赖只用于开发（eslint、vitest、playwright）。
- **MV3 service worker 会休眠**：内存里不存任何状态。每次事件触发都用 `chrome.tabs.query` 重新算重复组，标签数到几百个时也很快。撤销栈和"有意复制"标记存在 `chrome.storage.session` 里。
- **检测时机**：`tabs.onCreated` 触发时 URL 往往还是空的，所以以 `tabs.onUpdated` 带回的 `changeInfo.url` 为准（第一次拿到 URL 就判断，不用等页面加载完），再加上 `webNavigation.onCommitted` 识别重定向。`chrome://newtab`、`about:blank` 和空 URL 一律跳过。
- **竞态**：同一个标签在 300 ms 内的多次事件合并成一次处理；关闭前再确认一次两个标签都还在。
- **有意复制识别**：用 Peuj 文档里描述的方法——对「复制标签页」命令，导航事件会先于 `onCreated` 到达。我们按这个行为自己实现。
- **设置存储**：`chrome.storage.sync`，带 `schemaVersion` 字段，方便以后迁移。

## 5. 测试

1. **单元测试（vitest）**：URL 归一化（含追踪参数、IDN、端口、尾部斜杠）、通配和 regex 匹配、分组、优先级链。目标是 `src/core` 覆盖率 ≥ 90%。
2. **端到端测试（Playwright + Chromium，用 `--load-extension` 加载）**，场景：
   - 打开同一个 URL 两次 → 新开的被关掉，焦点回到旧标签
   - 不同 hash 视为同一页；带 `utm_source` 视为同一页
   - 白名单里的 URL 不会被关
   - 固定标签被保留
   - 撤销后标签恢复
   - 「询问」模式下不会自动关闭
   - 徽章数字正确
3. **人工冒烟测试**：在真实 Chrome 里打开 50 个以上标签，测试重定向（短链）、SPA 路由切换和无痕窗口。

## 6. 里程碑

| 阶段 | 内容 | 完成标准 |
| --- | --- | --- |
| M0 | 仓库、manifest、CI、lint、空的 popup 和设置页 | CI 通过；能以 unpacked 方式加载 |
| M1 | `core/` 纯函数和单元测试 | 单元测试全部通过 |
| M2 | background 判重、关闭、徽章、通知、撤销 | 上面的 e2e 场景全部通过 |
| M3 | popup 和设置页 UI，中英文界面 | 人工冒烟测试通过，截图写进 README |
| M4 | 发布 v0.1：GitHub Release 附 zip，Chrome Web Store 提交材料（图标、截图、隐私声明、逐项说明为什么需要每个权限） | 上架审核通过 |
| M5 | v0.2 功能 | 同上 |

## 7. 需要你决定的事

1. **仓库公开还是私有**：目前建成 **private**。如果想像 silex_vibra 那样开源，改成 public 即可（`gh repo edit silex-ai-lab/silex-tab-dedup --visibility public`）。
2. **许可证**：建议用 MIT（因为不复制 GPL 代码，可以用 MIT）。
3. **上架 Chrome Web Store**：需要一个开发者账号（一次性付 5 美元），由你本人注册。
4. **v0.3 会话管理**做不做。
