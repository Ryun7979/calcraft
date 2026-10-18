# CALCRAFT（さんすうドリル）

小学生向けの四則演算ドリル。マイクラ風のドット表現。React 19 + TypeScript + Vite 6 + Tailwind CSS v4。

## 約束
- 出力・報告・コミットメッセージは日本語。
- 「計画 → 確認 → 実行」。大きな変更は方針を聞いてから。
- コミット・プッシュはユーザーの指示があるまでしない。
- 外部通信を足さない（CDN・外部 API・解析タグなし。フォントは `@fontsource` で同梱）。API キーや `.env` を足さない。

## コマンド
- `npm run dev` … 開発サーバー（ポート 3000）
- `npm run lint` … 型チェック（`tsc --noEmit`）
- `npm run build` … 本番ビルド（完了の判定はこれが通ること）
- `npx tsx scripts/simulate.ts` … マシマシモードの数値の試算
- `node scripts/build-character-preview.mjs` … キャラクター（ブロッくん・ブロッちゃん・ゾンビ）の確認用デモ `docs/character/preview.html` を作り直す
- 聖域の自動チェック：開発サーバーでマシマシのプレイ画面を開き、ブラウザで `await import('/scripts/autoplay.js'); await window.__calcraftAutoplay({ wrongEvery: 4, bufferEvery: 3 })` → `ok: true`

## 構成
- 演出モードは2つ。オプション（メニュー右上の歯車）で切り替え、localStorage（キー `calcraft:v1`、`src/lib/storage.ts`）に保存。
  - **ひかえめ**：従来の画面 `src/components/{Menu,Playing,Result}Screen.tsx`。**変更しない方針**。
  - **マシマシ**：`src/components/hype/*` と `src/lib/hype/*`。仕様は `docs/spec.md`。
- 判定・出題・レベル自動調整は `src/hooks/useGame.ts` と `src/lib/gameLogic.ts`（両モード共通の中核。書き換えず、オプションの足し算で拡張する）。
- マシマシの数値はすべて `src/lib/hype/rules.ts`。盛り上がりの状態は `src/lib/hype/engine.ts`（純粋な関数）。

## マシマシモードの決まりごと
- **聖域は「入力の正確さ」**（`docs/spec.md` §3）。演出を足したら自動チェックを回す。
- 演出は React の再描画に乗せない：パーティクル・フラッシュは `FxCanvas` の ref 命令、シェイクは `element.animate()`、キャラは rAF。
- 演出レイヤーは必ず `pointer-events: none`。
- 大きなカットインのあいだは `pauses` に 'cutin' を入れる（FEVER ゲージの減り・チャレンジの時計・次の問題への進行が止まる）。
- キャラは `src/lib/hype/characters.ts`（スキン＋動き）、画面下の戦いは `src/components/hype/BattleField.tsx`（ゾンビは DOM を直接動かす）。

## 課題
- あとで直す不具合・改善は `docs/issues.md`。見つけたらここに足す。
- 学びは `LEARNINGS.md`、フェーズごとの引き継ぎは `docs/YYYY-MM-DD-<件名>.md`。
