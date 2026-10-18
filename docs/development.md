# CALCRAFT 開発マニュアル

このリポジトリで開発を始める人（人間・AI エージェント）のための手引きです。
**決まりごとの正は `CLAUDE.md`** で、この文書と食い違ったら `CLAUDE.md` に従います。
マシマシモードの仕様（数値の根拠・演出の一覧）は `docs/spec.md`、学びのメモは `LEARNINGS.md` にあります。

最終更新：2026-10-18

---

## 1. セットアップ

必要なもの：Node.js（npm）。外部の API キーや `.env` はいりません（足さないこと）。

```bash
npm install
npm run dev
```

http://localhost:3000 を開きます。メニュー右上の歯車で「ひかえめ／マシマシ」を切り替えます。

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバー（ポート 3000。`--host=0.0.0.0` なので同じ LAN のスマホからも開ける） |
| `npm run lint` | 型チェック（`tsc --noEmit`。`strict: true`、`@types/react` 入り） |
| `npm run build` | 本番ビルド（`dist/`）。**完了の判定はこれが通ること** |
| `npx tsx scripts/simulate.ts` | マシマシの数値（ランク・経験値・コイン）の試算 |
| `node scripts/build-character-preview.mjs` | キャラの確認用デモ `docs/character/preview.html` を作り直す |

- ポート 3000 を別の開発サーバーが使っているときは、`.claude/launch.json` に `npx vite --port=3001 --strictPort` の設定を一時的に足し、終わったら戻します。
- 公開は Vercel（`vercel.json`）。`/assets/` は長くキャッシュし、`index.html` はキャッシュしません。

## 2. 技術と約束

- React 19 + TypeScript + Vite 6 + Tailwind CSS v4。アニメは `motion`、アイコンは `lucide-react`。
- **外部通信なし**：CDN・外部 API・解析タグは使いません。フォントは `@fontsource` で同梱し、絵と音も `src/assets/` に同梱します。
- ファイルの改行は **CRLF**（`core.autocrlf=true`）。mp3・png・フォントは `.gitattributes` で `binary` にしてあり、この指定は外しません。

## 3. フォルダ構成

```
src/
  App.tsx                 画面の切り替え・設定と成長データの保持・音量などの反映
  hooks/useGame.ts        判定・出題・レベル自動調整（両モード共通の中核。書き換えない）
  lib/gameLogic.ts        問題を作る（レベルごとの出し方）
  constants/              記号・名前（index.ts）、レベルの説明（difficulty.ts）
  lib/storage.ts          保存（localStorage のキー calcraft:v1）
  lib/audio.ts            ひかえめモードの効果音（mp3）
  components/
    MenuScreen / PlayingScreen / ResultScreen.tsx   ひかえめモード（変更しない方針）
    OptionsDialog.tsx     オプション（両モード共通）
    ui/                   Button・Panel・FitStage（小さい画面で全体を縮める）
    hype/                 マシマシモードの画面と演出
  lib/hype/
    rules.ts              マシマシの数値はすべてここ
    engine.ts             盛り上がり（コンボ・FEVER・点数・ランク）の純粋な関数
    skills.ts / rewards.ts / collection.ts / daily.ts   成長・ごほうび・ガチャ・デイリー
    audio.ts              マシマシの音（効果音は合成、BGM・ジングルは mp3）
    characters.ts         キャラのスキンと動き
    assets.ts             絵の読みこみ（import.meta.glob）
    praise.ts             ほめことば
  assets/                 絵・音（Gemini 製。台帳は docs/assets.md）
scripts/
  autoplay.js             聖域の自動チェック（判定条件は変えない）
  simulate.ts             数値の試算
  asset-lab/              絵・曲の加工台（手順は .claude/skills/gemini-assets/SKILL.md）
docs/                     仕様・課題・引き継ぎ・このマニュアル
```

## 4. 動きのしくみ

### 4.1 画面の流れ

`App.tsx` が `useGame()` を持ち、`gameState`（`menu` → `playing` → `result`）と演出モードで画面を選びます。

- **判定はいつも `useGame.handleAnswer`**。マシマシの画面は判定をせず、`feedback`（`correct`／`incorrect`）の変化を見て演出だけを出します。
- マシマシは `useGame` のオプションで足し算します：`questionCount`・`feedbackMs`・`builtinSfx: false`・`holdAdvance`（大きなカットインの間は次の問題へ進まない）。
- プレイ中の盛り上がりの状態（`HypeState`）は `HypePlayingScreen` の ref にあり、`summaryRef` を通して結果画面へ渡します。

### 4.2 マシマシの演出の層

| 層 | 置き場所 | 動かし方 |
|---|---|---|
| パーティクル・花火・フラッシュ・飛ぶ文字 | `FxCanvas`（`FitStage` の外。画面全体） | ref の命令（`fx.current?.burst()` など） |
| ゆれ・ズーム・反転 | プレイ画面の `stageRef` | `element.animate()` |
| キャラ・ゾンビ | `BattleField`・`PixelChar` | rAF で DOM を直接動かす |
| HUD（点数・コンボ・ゲージ） | `HypeHud` | ref の `update()` を毎フレーム呼ぶ |
| カットイン・帯・カウントダウン | `Cutins.tsx` | React の state（大きいものは `pauses` に `'cutin'`） |

演出は React の再描画に乗せないのが基本です（毎フレームの setState をしない）。座標は `getBoundingClientRect()`（縮小後の実座標）で取ります。

### 4.3 音

- マシマシ：`hypeAudio`（`src/lib/hype/audio.ts`）。最初の操作（pointerdown／keydown）で AudioContext を作ります。
  音のつながりは `bgmBus → bgmVol → master`、`sfxBus → sfxVol → master` です。`bgmBus`・`sfxBus` は FEVER や duck（効果音のあいだ曲を下げる）で動くので、オプションの音量はその後ろの `bgmVol`・`sfxVol` にかけます（`setVolumes()`）。ジングルは効果音の側です。
- ひかえめ：`lib/audio.ts` の `HTMLAudioElement`。音量は `setSfxVolume()` でかけます。
- 曲・ジングルの切り出し位置と大きさは `audio.ts` の `LOOP`・`JINGLES`・`VOL` にまとまっています。

## 5. よくある作業

### 5.1 マシマシの数値を変える

1. `src/lib/hype/rules.ts` を変えます（ほかのファイルに数字を書かない）。
2. `npx tsx scripts/simulate.ts` で試算し、ランクの分布や「何回で終わるか」を確かめます。
3. `docs/spec.md` の該当する節（§7・§10・§11）を更新します。

### 5.2 演出を足す

1. 演出の層（4.2 の表）に合わせて置き場所を選びます。演出レイヤーには必ず `pointer-events: none` を付けます。
2. 画面の主要部分を隠す大きなカットインは `showCutin()` を通します（`pauses` に `'cutin'` が入り、FEVER ゲージの減り・チャレンジの時計・次の問題への進行が止まります）。
3. 入力欄（`HypeAnswerInput`）と、自動チェックが読む `data-testid=hype-question` の中の span 3つには触れません。札などは問題の要素の外（兄弟）に置きます。
4. 演出のつよさ（`INTENSITY`）ごとに出す・出さないを決めます。大きさの補間は `hypeSize()` を使います。
5. **聖域の自動チェック（7.2）を回します。**

### 5.3 オプション（設定）を足す

音量を足したときの手順です。

1. `src/types/index.ts` の `Settings` に項目を足します。
2. `src/lib/storage.ts` の `DEFAULT_SETTINGS` に初期値を、`normalize()` に読みこみ時の検査を足します（古い保存データには項目がないので、必ず初期値で埋めます）。
3. `src/components/OptionsDialog.tsx` に行（`Row`）を足します。1280×720 で画面に収まるか確かめます（いまは 36〜684px）。
4. `App.tsx` の `useEffect` で、設定を音や演出に反映します。

### 5.4 出題を変える

1. `src/lib/gameLogic.ts` を変えます。既存の動きを変えるときはユーザーの承認をとります。
2. `src/constants/difficulty.ts` の説明（メニューに出る）を合わせます。
3. 何万回か出題させて、条件に合わない問題が出ないことを数えて確かめます。くり上がりなどの条件は、一の位を先に選ぶ形にすると崩れにくくなります（`docs/issues.md` #2・#9）。

### 5.5 絵・音の素材を作る

- Gemini の Web 画面で作り、手元でドット化・切り抜きして `src/assets/hype/` に入れます。手順はスキル `gemini-assets`（`.claude/skills/gemini-assets/SKILL.md`）にあります。加工台は `scripts/asset-lab/` で、起動は `.claude/launch.json` の `asset-lab` です。
- 作ったものは `docs/assets.md`（台帳）に、頼んだ文と一緒に書きます。
- 画像は `import.meta.glob` で読むので、決まったフォルダに置けばコードの変更はほぼいりません。ブロック文字はファイル名にできない文字を `GLYPH_NAME` で読み替えます。

### 5.6 キャラを変える

`src/lib/hype/characters.ts`（スキンと動き）を変え、`node scripts/build-character-preview.mjs` で `docs/character/preview.html` を作り直して目で見ます。

## 6. CSS の落とし穴

- `src/index.css` の `.mc-panel`・`.mc-button`・`hype-*` などは `@layer` の外にあり、Tailwind のユーティリティより強いです。上書きするときは `!p-0`・`!absolute` のように `!` を付けます。
- **自作クラスに `display` を書くと、Tailwind の `flex`・`inline-flex` を打ち消します。** `.hype-quake` の `display: inline-block` で、ブロック文字の2桁の数字が縦に割れたことがあります（#11）。
- 傾けた部品にアニメを付けるときは、アニメを外側、傾きを内側の要素に分けます。

## 7. 検証

### 7.1 毎回

```bash
npm run lint
```

```bash
npm run build
```

完了の報告には、実行したコマンドとその出力を添えます。

### 7.2 聖域の自動チェック（マシマシの演出・入力に触れたとき）

1. 開発サーバーを起動し、マシマシで「あそぶ」を押して、プレイ画面が出てから始めます（結果画面のままだと偽の失敗になります）。
2. ブラウザのコンソールで：

   ```js
   await import('/scripts/autoplay.js'); await window.__calcraftAutoplay({ wrongEvery: 4, bufferEvery: 3 })
   ```

3. `ok: true` なら合格です。見ているのは次の3つです。
   - 判定が正しい（`judgedCorrect === expectCorrect`）
   - 正解・不正解の表示中に打った数字が次の問題に残る（`bufferFails === 0`）
   - 演出が入力欄をふさがない（`blockedSamples === 0`）

注意：
- **判定条件（`scripts/autoplay.js`）は変えません。** 通らないときにチェック側を緩めるのは修正ではありません。
- AI エージェントがアプリ内のブラウザで回すときは、**ペインを表に出してから**回します。隠れていると rAF・タイマーが止まり（1 秒に 1 コマ程度）、時間切れで `ok: false` になります。これは偽の失敗です。1 分以上かかるもの（チャレンジ）は、待たずに始めて結果を `window.__res` に入れ、少しずつ見に行きます。
- 終わったらタブを閉じます（BGM が鳴りつづけることがあります）。テストで変えた保存データ（問題数など）は戻します。

### 7.3 画面の大きさ

`FitStage` は 1280×720 を基準に縮めます。1280×720 と、狭い画面（幅 580px 前後）で、はみ出しと重なりがないかを見ます。

## 8. 保存データ

localStorage のキー `calcraft:v1` に、次の形で1つにまとめています。

```ts
{
  settings: Settings,            // 演出モード・強さ・BGM・音量・問題数・チャレンジ・休けい
  best: Record<string, number>,  // 自己ベスト（bestKey / challengeKey）
  progress: Progress,            // 経験値・スキル・コイン・ガチャ・装備・デイリー・連続日数
}
```

- 書き換えは必ず `mutateSave()` を通します（毎回読み直してから書くので、画面どうしで上書きし合いません）。
- 読みこみは `normalize()` が、知らない値・古い形・壊れたデータを初期値で埋めます。項目を足したらここも足します。
- 結果画面の保存（自己ベスト・ごほうび）は1プレイ1回です。StrictMode で effect が2回走っても二重にならないよう、`WeakMap` で守っています。

## 9. コミットまでの手順

1. ユーザーの指示があるまでコミット・プッシュはしません。作業が終わったら「コミットしてよいか」を聞きます。
2. `git status` で変更一覧を見て、`dist/`・`node_modules/`・ログが混ざっていないか確かめます。
3. 改行が CRLF のままか確かめます。Git Bash の `sed -i` は CRLF を LF にしてしまうので使いません。

   ```bash
   tr -cd '\r' < 対象のファイル | wc -c
   ```

   この数と `wc -l` の行数が同じなら CRLF のままです。
4. コミットメッセージは日本語で、何を変えたかに加えて、なぜそうしたかを書きます。
5. `LEARNINGS.md` の追記は、実装とは別のコミットにします。追記したら `wc -c LEARNINGS.md` を確かめ、40KB を超えていたら切り出しを提案します。

## 10. 文書の地図

| 文書 | 中身 |
|---|---|
| `CLAUDE.md` | 決まりごと（正） |
| `LEARNINGS.md` | 効いたこと・失敗・事実・保留（セッションの始めに読む） |
| `docs/development.md` | このマニュアル |
| `docs/spec.md` | マシマシモードの仕様と数値の根拠 |
| `docs/issues.md` | 不具合・改善の一覧（見つけたらここに足す） |
| `docs/assets.md` | 絵・音の台帳（Gemini に頼んだ文） |
| `docs/hade-mashimashi-playbook.md` | マシマシを作ったときの指示書 |
| `docs/YYYY-MM-DD-*.md` | フェーズごとの引き継ぎ |
| `docs/character/preview.html` | キャラの確認用デモ |
