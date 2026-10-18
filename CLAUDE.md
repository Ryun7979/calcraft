# CALCRAFT（さんすうドリル）

小学生向けの四則演算ドリル。マイクラ風のドット表現。React 19 + TypeScript + Vite 6 + Tailwind CSS v4。

## 約束
- 外部通信を足さない（CDN・外部 API・解析タグなし。フォントは `@fontsource` で同梱）。API キーや `.env` を足さない。
- 言語・合意形成・コミットの扱いは末尾の「AIエージェントへのルール」に従う。

## コマンド
- `npm run dev` … 開発サーバー（ポート 3000）
- `npm run lint` … 型チェック（`tsc --noEmit`）
- `npm run build` … 本番ビルド（完了の判定はこれが通ること）
- `npx tsx scripts/simulate.ts` … マシマシモードの数値の試算
- `node scripts/build-character-preview.mjs` … キャラクター（ブロッくん・ブロッちゃん・ゾンビ）の確認用デモ `docs/character/preview.html` を作り直す
- 聖域の自動チェック：開発サーバーでマシマシのプレイ画面を開き、ブラウザで `await import('/scripts/autoplay.js'); await window.__calcraftAutoplay({ wrongEvery: 4, bufferEvery: 3 })` → `ok: true`

## 版管理
- Git。既定ブランチは `main`。ユーザーの指示があるまでコミット・プッシュしない。終わったら「コミットしてよいか」を聞く。
- コミットメッセージは日本語で、何を変えたかに加えてなぜそうしたかを書く。`LEARNINGS.md` の追記は実装とは別コミットにする。
- コミット前に変更一覧を見て、`dist/`・`node_modules/`・ログが混ざっていないか確かめる。
- ファイルは CRLF（`core.autocrlf=true`）。`.gitattributes` の `binary` 指定（mp3・png・フォント）は外さない。外すと音声・画像が改行変換で壊れる。

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

## 検証
- 完了の判定は `npm run build` が通ること。マシマシの演出・入力に触れたら聖域の自動チェック（`ok: true`）も回す。
- **完了報告には、実行したコマンドとその出力を根拠として添える。** 「動いたはず」で完了にしない。

## ガードレール
### 変えてはいけないもの
- 聖域の自動チェック `scripts/autoplay.js` の判定条件。通らないときにチェック側を緩めるのは修正ではない。変える必要があると思ったら、変えずに理由を報告して止まる。
- ひかえめモードの画面と、`useGame.ts`・`gameLogic.ts` の既存の動き（足し算での拡張だけ）。

### 止まる条件
次のどれかに当てはまったら、作業を中断してユーザーに報告する。
- 同じ修正を3回試しても検証が通らない、または2回続けて結果が良くならない
- 変更が計画で挙げたファイルを超えそうになった
- 上の「変えてはいけないもの」に手を入れないと先に進めない

## 課題
- あとで直す不具合・改善は `docs/issues.md`。見つけたらここに足す。
- 学びは `LEARNINGS.md`、フェーズごとの引き継ぎは `docs/YYYY-MM-DD-<件名>.md`。

## AIエージェントへのルール (STRICT CONSTRAINTS)
1. **出力の完全日本語化**: 分析、提案、実装計画、タスクリスト、コミットメッセージ等、すべての出力・報告は日本語で行う。
2. **ステップバイステップの合意形成**: "Plan, Confirm, Execute"（計画し、確認し、実行する）を守り、勝手に実装を進めない。
3. **ユーザーの承認待機**: 実装や修正の前に「この方針で進めてよいか」を日本語で聞き、明確な承認を得るまでコードの生成・書き換えをしない。ただし、**変更内容を1文で説明できる小さな修正**（誤字、ログ追加、変数名の変更など）は確認なしで実施してよい。
4. **LEARNINGS.md の参照と手入れ**: セッション開始時に `LEARNINGS.md` を読み、内容を簡潔に要約して読んだことが分かるようにする。作業の終わりに追記したら、その場で `wc -c LEARNINGS.md` を確認し、40KB を超えていたら切り出しを提案する。
5. **本ファイルの優先**: 本ファイルと過去の設計書・引き継ぎ文書（`docs/`）が食い違ったら、常に本ファイルが正。文書側が古いことを指摘したうえで本ファイルに従う。
