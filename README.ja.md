<p align="center">
  <img src="icons/icon-128.png" width="80" height="80" alt="">
</p>

<h1 align="center">Tab Dedup</h1>

<p align="center">
  <strong>重複したタブを開いた瞬間に閉じ、閉じたタブはいつでも元に戻せます。</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT"></a>
  <a href="#インストール"><img src="https://img.shields.io/badge/Manifest-V3-4285F4.svg?style=for-the-badge" alt="Manifest V3"></a>
  <a href="#権限"><img src="https://img.shields.io/badge/Network-none-2ea44f.svg?style=for-the-badge" alt="Network: none"></a>
  <a href="https://github.com/silex-ai-lab/silex-tab-dedup/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/silex-ai-lab/silex-tab-dedup/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI"></a>
  <a href="https://github.com/silex-ai-lab/silex-tab-dedup/stargazers"><img src="https://img.shields.io/github/stars/silex-ai-lab/silex-tab-dedup?style=for-the-badge" alt="GitHub stars"></a>
</p>

<p align="center">
  <a href="#クイックスタート">クイックスタート</a> · <a href="#機能">機能</a> · <a href="#権限">権限</a> · <a href="#判定の仕組み">判定の仕組み</a>
  <br>
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · 日本語 · <a href="README.ko.md">한국어</a>
</p>

---

<sub>英語版 README が正式版です。この翻訳は更新が遅れることがあります。</sub>

Manifest V3 の Chrome 拡張機能です。要求する権限は最小限で、ネットワーク通信もテレメトリもありません。オープンソース（MIT）。

<p align="center">
  <img src="docs/popup-light.png" width="260" alt="Popup listing duplicate tabs">
  &nbsp;
  <img src="docs/popup-search-light.png" width="260" alt="Quick search over open tabs">
  &nbsp;
  <img src="docs/popup-dark.png" width="260" alt="The popup in dark mode">
</p>

> ⭐ **このリポジトリに Star を**付けると、新機能や修正を追いかけられます。拡張機能が依存している部分を Chrome が変更したときは、私が直すので、あなたが気にする必要はありません。[Star する理由 →](#-star-する理由)

## なぜ Tab Dedup？

- 🔁 **そのページは、忘れていた別のタブですでに開いていた** → Tab Dedup が新しいタブを閉じ、もともと開いていたタブに切り替えます。
- ↩️ **すでにページを表示しているタブでリンクをクリックした** → リンク先が別のタブで開いているなら、そのタブは閉じずに**前のページに戻り**ます。タブの履歴は残ります。
- 🧯 **間違ったタブを閉じた** → 閉じたタブはすべてポップアップから元に戻せて、履歴ごと復元されます。
- 🧹 **同じページなのに URL に余計なものが付いている** → `?utm_source=…`、`fbclid`、`www.`、末尾の `/` が違うだけなら同じページとして扱います。
- 🛡️ **わざと 2 つ開いている** → Chrome の「複製」（**Duplicate**）で意図的に複製したタブ、再読み込みしたタブ、復元したタブは閉じません。

### ✅ インストール前に

| | |
|---|---|
| 💰 **無料・オープンソース** | MIT ライセンス。 |
| 🔒 **通信なし** | ネットワーク通信なし、テレメトリなし、アカウント不要。 |
| 🧩 **サイトへのアクセス権限なし** | コンテンツスクリプトもありません。拡張機能はどのページの内容も読み取ったり変更したりできません。[権限](#権限)を参照。 |
| ↩️ **元に戻せる** | 閉じたタブはすべてポップアップから元に戻せます。 |
| 🧪 **CI でテスト** | 判定ロジックの単体テストと、拡張機能を Chromium に読み込む E2E テストがあります。[ブラウザ](#ブラウザ)を参照。 |
| ⚠️ **Chrome ウェブストアには未公開** | ソースまたはリリースの zip から「パッケージ化されていない拡張機能を読み込む」（**Load unpacked**）でインストールします。[インストール](#インストール)を参照。 |

## ブラウザ

| ブラウザ | 状況 |
|---|---|
| Chromium | E2E テストはここで実行され、push のたびに CI で走ります。 |
| Google Chrome 116+ | 拡張機能が要求する最低バージョン。「パッケージ化されていない拡張機能を読み込む」でインストールします。自動テストの対象外です。最近の正式版 Chrome では、テストツールからパッケージ化されていない拡張機能を読み込めません。 |
| Edge, Brave, Vivaldi, Opera | Chromium ベース。同じように動くはずですが、未テストです。 |

## 機能

| | |
| --- | --- |
| **3 つのモード** | 「閉じる」（既定）は重複タブを閉じます。「確認」は「切り替える」「両方残す」を選べる通知を出します。「マークのみ」はバッジで重複数を数えるだけです。 |
| **どのタブを残すか** | 固定タブを優先し、次に先に開いたタブ（後に開いたタブにも変更可）。固定タブは決して閉じません。 |
| **ポップアップ** | 重複をページごとにまとめて表示。「重複 N 件を閉じる」ボタン、各タブを閉じる・移動する操作、**元に戻す**付きの「最近閉じたタブ」一覧。 |
| **クイック検索** | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> で、検索欄にカーソルがある状態でポップアップが開きます。数語入力し、<kbd>↑</kbd> <kbd>↓</kbd> で選んで <kbd>Enter</kbd> を押すとそのタブに切り替わります。 |
| **サイト別の全タブ** | 開いているすべてのタブをサイトごとにまとめ、多い順に表示。サイト単位でワンクリックで閉じ、ワンクリックで元に戻せます。 |
| **セッション** | 今のウィンドウまたはすべてのウィンドウを保存し、保存後にタブを閉じることもできます。復元時は保存したウィンドウごとに開き直しますが、すでに開いているページは開きません。セッション名の変更、個別タブの削除、JSON またはどのブラウザでも読み込めるブックマーク HTML への書き出しができます。読み込みは本拡張機能の JSON、ブックマークファイル、Tab Options の書き出しファイル、URL の一覧に対応します。 |
| **ショートカット** | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> で重複タブをすべて閉じます。どちらのショートカットも `chrome://extensions/shortcuts` で変更できます。 |
| **判定ルール** | トラッキングパラメータ、`www.`、末尾のスラッシュ、`#fragment`、クエリ文字列全体、大文字小文字を無視できます。Gmail のようにフラグメントでページを切り替えるアプリがあるため、既定ではフラグメントも比較します。 |
| **重複とみなさない** | ドメイン（`mail.google.com`）、ワイルドカード（`github.com/*/pull/*`）、または `/regular expression/`（正規表現）。 |
| **高度な判定** | 「同じページとして扱う」ルール（例: `youtube.com/watch*`）、「複数ドメインのサイト」（`yandex.*`）、ポップアップとショートカットのみに使うタイトル一致（任意）。 |
| **バックアップ** | 設定はブラウザのアカウントで同期されます。JSON ファイルへの書き出し、読み込み、初期化もできます。 |
| **範囲** | すべてのウィンドウ横断、またはウィンドウごと。シークレットタブが通常タブと一致することはなく、シークレットウィンドウを完全に無視することもできます。 |
| **表示言語** | 英語と簡体字中国語。 |

## クイックスタート

### インストール

Chrome ウェブストアにはまだありません。ソースからインストールします:

1. [Releases](https://github.com/silex-ai-lab/silex-tab-dedup/releases) から `silex-tab-dedup-<version>.zip` をダウンロードして展開するか、このリポジトリを clone します。
2. `chrome://extensions` を開き、**デベロッパー モード**（Developer mode）をオンにします。
3. **パッケージ化されていない拡張機能を読み込む**（Load unpacked）をクリックし、`manifest.json` があるフォルダを選びます。

clone を更新するには `git pull` を実行し、`chrome://extensions` で拡張機能のカードにある再読み込みボタン ↻ をクリックします。

### 最初の 2 分間

1. どのページでもよいので開き、同じページを新しいタブでもう一度開きます。新しいタブが閉じて、最初のタブに戻ります。
2. ツールバーのアイコンをクリックし、「最近閉じたタブ」の下で**元に戻す**をクリックします。タブが戻ってきます。
3. <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> を押し、タブのタイトルにある語をいくつか入力して <kbd>Enter</kbd> を押します。

## 権限

| 権限 | 理由 |
| --- | --- |
| `tabs` | 重複を探すためにタブの URL とタイトルを読む。タブを閉じる・前面に出す。 |
| `webNavigation` | タブがいつ、どのように移動したか（リンクか、再読み込み・戻る/進む・復元か）を知り、新しい移動だけを処理する。 |
| `sessions` | 元に戻す: 閉じたタブを履歴ごと開き直す。 |
| `storage` | 設定（ブラウザのアカウントで同期）、保存したセッション（このブラウザのみ）、元に戻す一覧（メモリ上のみ）を保持する。 |
| `notifications` | 「確認」モードと、任意の「元に戻す」通知。 |
| `favicon` | ポップアップとセッションページにサイトのアイコンを表示する（Chrome 自身のキャッシュから）。 |

サイトへのアクセス権限もコンテンツスクリプトもありません。拡張機能はどのページの内容も読み取ったり変更したりできません。

## 判定の仕組み

1. タブで移動が確定します。再読み込み、戻る/進む、セッションの復元、Chrome の「複製」は無視します。
2. URL を正規化し（「判定ルール」を参照）、範囲内のほかのタブと比べます。除外リストの URL、新しいタブページ、読み込み中のタブは対象外です。
3. ほかのタブがすでに同じページを表示していれば、優先されるタブを残します。まず固定タブ、次に既定では先に開いたタブです。
4. 移動したタブを閉じます。そのタブが直前に別のページを表示していた場合は、閉じずにそのページへ戻ります。閉じたタブが前面にあった場合は、残したタブにフォーカスが移ります。

## 設計方針

- **今開いたものだけを処理する。** 閉じたり戻したりするのは移動したタブだけです。ほかの場所にある重複はポップアップとショートカットに任せます。
- **閉じたタブはすべて元に戻せる。** ポップアップの「最近閉じたタブ」から、履歴ごとタブを開き直せます。
- **ページではなくタブを読む。** サイトへのアクセス権限もコンテンツスクリプトもないので、ページの中身を見ることはありません。

## ⭐ Star する理由

私は毎日 Tab Dedup を使っているので、メンテナンスを続けます。

- 機能や判定ルールの要望があれば追加します。
- **無料・ローカル・小さく**保ちます。アカウント不要、有料プランなし、外部への送信なし、サイトへのアクセス権限なし。
- 拡張機能が依存している API を Chrome が変更したら、私が直します。あなたが見張る必要はありません。

ほかの理由:

- 🧪 **書いてあるだけでなく、テストしている。** push のたびに CI が単体テストを実行し、拡張機能を Chromium に読み込んで E2E テストを行います。
- ↩️ **何も失わない。** サイト単位でまとめて閉じた場合も含め、閉じたタブはすべてポップアップから元に戻せます。
- 🔒 **権限は最小限。** [権限](#権限)の表に、それぞれが必要な理由を書いています。
- 🌏 **4 言語で読める:** この README は English、简体中文、日本語、한국어 で読めます。拡張機能の画面は英語と簡体字中国語です。
- 📣 **ほかの人が見つけやすくなる。** Star があると、タブに埋もれているほかの人も Tab Dedup を見つけやすくなります。

次に同じページを 3 つ開いてしまったときにすぐ見つけられるよう、Star を付けておいてください。⭐

## 開発

```sh
npm install
npm test            # unit tests (vitest)
npm run test:e2e    # loads the extension into Chromium with Playwright
npm run lint
npm run package     # dist/silex-tab-dedup-<version>.zip
```

ビルド手順はありません。素の ES modules なので、そのまま「パッケージ化されていない拡張機能」として読み込めます。`src/core/` は `chrome.*` を呼ばない純粋なロジックで、単体テストしやすくしています。`src/background.js` は service worker です。UI の文言は `scripts/messages.mjs` にあり、編集後は `npm run locales` を実行します。

ロードマップと、ほかの重複タブ拡張機能との比較は [PLAN.md](PLAN.md) にあります。

## ライセンス

[MIT](LICENSE) © 2026 Silex AI Lab。動作は [Duplicate Tabs Closer](https://github.com/Peuj/duplicate-tabs-closer)（GPL-3.0）、[Tab Options](https://github.com/aghontpi/Tab-Options)（Apache-2.0）、Clutter Free を参考にしましたが、コードはコピーしていません。
