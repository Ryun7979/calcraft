---
name: gemini-assets
description: CALCRAFT のマシマシモードの絵（ドットのタイル・粒・枠・キャラの絵）を Google Gemini の Web 画面で作り、手元でドット化・切り抜きして src/assets/hype/ に取りこむ手順。素材を作る・作り直すときに使う。
---

# Gemini で素材を作る

API は使わない。Gemini の Web 画面を Claude in Chrome（ユーザーのいつもの Chrome。ログイン済み）で操作する。
採用したものは `docs/assets.md` にプロンプト全文と加工内容を書く。元の絵と未採用は `_inbox/`（git 管理外）。

## 1. 頼む

1. 新しいタブで `https://gemini.google.com/app` を開く（1枚ごとに新しいチャット）。
2. 入力欄 `rich-textarea .ql-editor` に `document.execCommand('insertText', false, プロンプト)` で入れ、
   `button[aria-label="プロンプトを送信"]` を押す（JS からでよい）。
3. タブを2つ使えば2枚を並行して作れる。1枚 30〜60 秒。
4. 見本の絵を添えるとき：「アップロードとツール」ボタンを押すと `input[type=file][accept="image/*"]` が出るので、
   それに `file_upload` で渡す（ボタンを押して出るファイル選択の画面は使わない）。

頼み方のコツは `docs/assets.md` の「共通の頼み方」と、各素材のプロンプトをそのまま流用する。

## 2. ダウンロードする

- 「フルサイズの画像をダウンロード」ボタンは、**絵の上にマウスを乗せてから、画面上でクリック**する。JS の `click()` ではダウンロードされない。
- ファイルは `~/Downloads/Gemini_Generated_Image_*.jpg`（**JPEG**）。10 秒ほどかかる。
  `find ~/Downloads -maxdepth 1 -name 'Gemini_Generated_Image_*' -mmin -1` で新しいものだけをつかみ、`_inbox/` に名前を付けて移す。

## 3. 加工する（加工台）

`.claude/launch.json` の `asset-lab`（`node scripts/asset-lab/server.mjs`、ポート 5199）を `preview_start` で起動し、
アプリ内ブラウザで `http://127.0.0.1:5199/` を開く。ページの JS から次の道具を呼ぶ（`scripts/asset-lab/lab.html`）。

| 道具 | 使い道 |
|---|---|
| `load('tiles1.jpg')` | `_inbox/` の絵を Canvas に読む |
| `boxes(cv, {white, minGap})` | 白い余白で区切られた絵の位置（余白がせまいときは `white: 245, minGap: 3`） |
| `crop(cv, box, inset)` / `trim(cv)` / `square(cv)` | 切り出し・切りつめ・正方形に余白を足す |
| `cutout(cv, {tol})` | ふちから白をたどって透明に（tol 30〜40） |
| `dotSize(cv)` | 1ドットの大きさ（色の変わり目の間かく）。ページ上で定義して使う（下の例） |
| `pixelate(cv, w, h, core)` | 本物のドットに縮める（各マスの中央の平均色） |
| `hardAlpha(cv)` | 半透明をなくす |
| `tile(cv, 3)` / `show(cv, label, zoom)` | くり返しの見え方を確かめる・画面に並べる |
| `save(cv, '_inbox/px/xxx.png')` | PNG で保存（`_inbox/` と `src/assets/hype/` の中だけ） |

よく使った組み合わせ：
- タイル：`pixelate(crop(cv, box, 4), 16)`（細かい絵は 32）
- 粒：`hardAlpha(pixelate(square(trim(cutout(crop(...), {tol: 40}))), 20))`
- 枠・キャラの絵：`cutout` → `trim` → `dotSize` で1ドットの大きさを見て、幅と高さをその値で割ったドット数に `pixelate`

## 4. 取りこむ

- `src/assets/hype/{tiles,parts,ui,pose}/名前.png` に置き、型の名前を `src/lib/hype/assets.ts` に足す（`import.meta.glob` で自動で読む）。
- 表示は `image-rendering: pixelated` で拡大する。
- 確認：`npm run build`、聖域の自動チェック（`ok: true`）、画面のスクリーンショット。
- 終わったら Chrome のタブと加工台のサーバーを閉じる。
