// Source of truth for UI strings. `npm run locales` writes _locales/*/messages.json.
// $1 is a positional substitution (chrome.i18n.getMessage(key, [value])).
import { mkdirSync, writeFileSync } from 'node:fs';

const M = {
  extName: ['Tab Dedup — close duplicate tabs', 'Tab Dedup — 关闭重复标签页'],
  extDescription: [
    'Closes duplicate tabs as they open and switches you to the tab you already had. Undo any close. No data leaves your browser.',
    '打开重复标签页时自动关闭并切到已有的那个，可撤销。数据不离开浏览器。',
  ],
  cmdCloseDuplicates: ['Close all duplicate tabs', '关闭所有重复标签页'],
  badgeTitleSome: ['Tab Dedup: $1 duplicate tabs', 'Tab Dedup：$1 个重复标签页'],
  badgeTitleNone: ['Tab Dedup: no duplicate tabs', 'Tab Dedup：没有重复标签页'],
  askTitle: ['This page is already open', '这个页面已经打开了'],
  askSwitch: ['Switch to it and close this one', '切过去并关掉这个'],
  askKeep: ['Keep both', '两个都保留'],
  closedTitle: ['Closed a duplicate tab', '已关闭一个重复标签页'],
  undo: ['Undo', '撤销'],
  popupTitle: ['Duplicate tabs', '重复标签页'],
  openOptions: ['Settings', '设置'],
  modeLabel: ['When a duplicate opens', '打开重复页时'],
  modeAuto: ['Close', '关闭'],
  modeAsk: ['Ask', '询问'],
  modeOff: ['Only flag', '仅标记'],
  emptyTitle: ['No duplicate tabs', '没有重复标签页'],
  recentlyClosed: ['Recently closed', '最近关闭'],
  closeTab: ['Close this tab', '关闭这个标签页'],
  agoSeconds: ['$1 s ago', '$1 秒前'],
  agoMinutes: ['$1 min ago', '$1 分钟前'],
  agoHours: ['$1 h ago', '$1 小时前'],
  tabsInGroup: ['$1 tabs', '$1 个'],
  windowN: ['Window $1', '窗口 $1'],
  pinned: ['Pinned', '已固定'],
  active: ['Current', '当前'],
  kept: ['Kept on purpose', '有意保留'],
  andMore: ['and $1 more', '等 $1 个'],
  sentBack: ['Sent back', '已返回上一页'],
  closedLabel: ['Closed', '已关闭'],
  closeAllN: ['Close $1 duplicates', '关闭 $1 个重复标签页'],
  shortcutHint: ['Shortcut: $1 closes all duplicates', '快捷键 $1：关闭所有重复标签页'],
  optionsTitle: ['Tab Dedup settings', 'Tab Dedup 设置'],
  optionsSubtitle: ['Changes save automatically.', '修改会自动保存。'],
  secBehaviour: ['Behaviour', '行为'],
  modeAutoLong: ['Close it and switch to the existing tab', '关掉它并切到已有的标签页'],
  modeAskLong: ['Ask me with a notification', '用通知询问我'],
  modeOffLong: ['Only count it on the badge', '只在图标上计数'],
  scopeLabel: ['Look for duplicates', '查找范围'],
  scopeAll: ['Across all windows', '所有窗口'],
  scopeWindow: ['Within each window', '每个窗口各自查找'],
  keepLabel: ['Which tab to keep', '保留哪一个'],
  keepOlder: ['The one opened first', '先打开的'],
  keepNewer: ['The one opened last', '后打开的'],
  protectPinned: ['Never close pinned tabs', '从不关闭已固定的标签页'],
  skipIncognito: ['Ignore incognito windows', '忽略无痕窗口'],
  notifyOnClose: ['Show a notification with Undo after each automatic close', '每次自动关闭后显示带「撤销」的通知'],
  showBadge: ['Show the duplicate count on the toolbar icon', '在工具栏图标上显示重复数量'],
  secMatching: ['Which URLs count as the same page', '哪些网址算同一个页面'],
  stripTracking: ['Ignore tracking parameters (utm_*, fbclid, gclid …)', '忽略追踪参数（utm_*、fbclid、gclid 等）'],
  ignoreWww: ['Ignore “www.” in the domain', '忽略域名里的「www.」'],
  ignoreTrailingSlash: ['Ignore a trailing slash in the path', '忽略路径末尾的斜杠'],
  ignoreHash: ['Ignore the #fragment', '忽略 # 后面的部分'],
  ignoreHashHint: [
    'Leave off for apps such as Gmail that use the fragment to tell pages apart.',
    'Gmail 等应用用 # 区分不同页面，建议保持关闭。',
  ],
  ignoreQuery: ['Ignore the whole query string (?…)', '忽略整个查询字符串（? 之后）'],
  ignoreCase: ['Ignore upper/lower case in the path', '路径不区分大小写'],
  secWhitelist: ['Never treat as duplicates', '从不视为重复'],
  whitelistHint: ['One pattern per line.', '每行一个规则。'],
  patHost: ['a domain and its subdomains', '一个域名及其子域名'],
  patGlob: ['* matches anything', '* 匹配任意内容'],
  patRegex: ['a regular expression between slashes', '写在两个斜杠之间的正则表达式'],
  secShortcut: ['Keyboard shortcut', '快捷键'],
  shortcutLabel: ['Close all duplicates:', '关闭所有重复标签页：'],
  editShortcut: ['Change', '修改'],
  saved: ['Saved', '已保存'],
  invalidPatterns: ['These patterns are invalid and are ignored: $1', '以下规则无效，已忽略：$1'],
  notSet: ['not set', '未设置'],
};

const locales = { en: 0, zh_CN: 1 };
for (const [locale, i] of Object.entries(locales)) {
  const out = {};
  for (const [key, texts] of Object.entries(M)) out[key] = { message: texts[i] };
  const dir = new URL(`../_locales/${locale}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('messages.json', dir), JSON.stringify(out, null, 2) + '\n');
}

export const KEYS = Object.keys(M);
