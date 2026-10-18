# 引き継ぎ：マシマシモード P0〜P1（2026-10-18）

## やったこと

### P0 準備
- AI Studio の名残を削除：`@google/genai`・`express`・`dotenv`・`@types/express` の依存、`vite.config.ts` の `GEMINI_API_KEY` 定義、`.env.example`。パッケージ名を `calcraft` に。
- フォントを同梱：`index.html` の Google Fonts 読み込みをやめ、`@fontsource/dotgothic16`・`@fontsource/press-start-2p` を `src/main.tsx` で読む（外部通信なし）。
- `CLAUDE.md`・`LEARNINGS.md`・`docs/issues.md`・`docs/spec.md` を追加。指示書を `docs/hade-mashimashi-playbook.md` に移動。
- `.claude/launch.json`（開発サーバーの起動設定）を追加。
- 見つけた不具合は直さずに `docs/issues.md` に記録（ユーザーの指示）。画面サイズに合わせて縮小する仕組みも課題として記録。

### P1 コア（マシマシモード）
- 追加したファイル
  - `src/lib/hype/rules.ts`（数値）、`engine.ts`（コンボ・FEVER・点数・ランクの純粋な関数）、`praise.ts`（ほめことば）、`audio.ts`（Web Audio の効果音・BGM）、`blockun.ts`（相棒キャラの絵と動き）
  - `src/components/hype/`：`FxCanvas`・`Blockun`・`PraiseBubble`・`HypeHud`・`HypeAnswerInput`・`Cutins`・`HypeMenuScreen`・`HypePlayingScreen`・`HypeResultScreen`
  - `src/components/OptionsDialog.tsx`、`src/lib/storage.ts`
  - `scripts/simulate.ts`（数値の試算）、`scripts/autoplay.js`（聖域の自動チェック）、`scripts/build-character-preview.mjs`、`docs/character/preview.html`
- 変更したファイル
  - `src/hooks/useGame.ts`：オプション `questionCount` / `feedbackMs` / `builtinSfx` / `holdAdvance` を追加。問題数を `TOTAL_QUESTIONS` 固定から「その回の問題数」に。判定ロジックは変更なし。
  - `src/App.tsx`：設定の読み書き、モードで画面を切り替え、歯車ボタン、FxCanvas。
  - `src/types/index.ts`：`Settings` などの型。`src/index.css`：`hype-*` クラス。
- ひかえめモードの3画面（`MenuScreen` / `PlayingScreen` / `ResultScreen`）は変更していない。
- 初期設定は「マシマシ・MAX・BGM オン・10問」。

## 確認したこと
- `npm run lint` / `npm run build` が通る。
- 聖域の自動チェック（`scripts/autoplay.js`）がすべて `ok: true`：
  - たしざん Lv1 10問（わざと2問まちがい・先打ち3回）／20問、わりざん Lv6 あまりあり 10問（まちがい3・先打ち4回）、リミックス Lv3 20問（まちがい4・先打ち9回）、演出のつよさ「ひかえめ」10問。
  - 入力欄の中心に演出がかぶったサンプル数 0（50ms ごと、計 2,000 サンプル以上）。カットイン中に問題が進んだ回数 0。
- ブラウザで目視：カウントダウン、コンボ段階アップのカットイン、FEVER 突入（暗転＋虹 → 帯とブロッくん）、FEVER ×4・×8 の帯とふちのネオン、結果発表（数え上げ・ランク・自己ベスト・「あと○点で」）、Enter でもう一回、オプション、ひかえめモードへの切り替え（従来の4問の画面になる）。
- 確認できていないこと：
  - **音は耳で聞いていない**（自動操作では音が出ない／聞けないため）。
  - 1920×1080 などの大きな画面での見た目（確認用の画面が 580×676 と狭く、大きな画面はスクリーンショットが縮小されて細部が見えなかった）。狭い画面でははみ出しがある → `docs/issues.md` #4。
  - スマホ・タッチ操作。

## 次にやること（候補）
1. ユーザーに実際に遊んでもらい、音の大きさ・ほめことばの頻度・演出の強さの感想をもらう（LEARNINGS.md の Open Questions）。
2. `docs/issues.md` の不具合・改善（とくに #4 画面に合わせた縮小）。
3. P2（経験値・プレイヤーレベル・ゴールデン問題）に進むか決める。
4. 素材の差し替え（Gemini の Web 画面で BGM・ロゴ）。`audio.ts` の `playBgm()` の中身を差し替える形。
