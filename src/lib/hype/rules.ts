// マシマシモードの数値はすべてここに集める。
// 値の根拠は docs/spec.md の「数値の試算」（scripts/simulate.ts で再現できる）。

export const RULES = {
  /** コンボ（連続正解）の段階。tiers[i] 以上で段階 i */
  combo: {
    tiers: [0, 2, 4, 7, 10],
    mult: [1.0, 1.2, 1.5, 2.0, 3.0],
    names: ['', 'ノリノリ！', 'アツい！', 'すごすぎ！', '覚醒！！'],
    /** この数ごとにコンボのカットイン（ひかえめ・ふつうでは帯）を出す */
    bandEvery: 3,
  },

  /** FEVER ゲージ（0〜max） */
  gauge: {
    max: 100,
    /** 数字を1つ打つ */
    key: 4,
    /** 正解 */
    correct: 26,
    /** FEVER の外でまちがえたとき、残す割合 */
    keepOnMiss: 0.75,
  },

  /** FEVER（ゲージで続く。時間ではない） */
  fever: {
    /** 段階ごとの、何もしないで空になるまでの秒数 */
    emptySec: [24, 20, 16, 13],
    key: 2,
    correct: 30,
    miss: 20,
    /** この数の正解ごとに段階が上がる */
    stageEvery: 3,
    mult: [2, 4, 8, 16],
  },

  score: {
    base: 100,
    /** 答えの桁数ごとの上のせ（むずかしい問題ほど少し多く） */
    perDigit: 20,
  },

  /**
   * ランク。点数は FEVER で倍々にふくらむので、満点との比を「対数」でくらべる：
   *   ランク値 = log(1 + 点数) / log(1 + 満点)   （満点 = その回の問題を全部正解したときの点数）
   * SSS は全問正解（ランク値 1）。∞ は 20問以上を全問正解したときだけ（ほぼ届かない演出用）。
   * しきい値は scripts/simulate.ts の試算で決めた（docs/spec.md §7）。
   */
  rank: [
    { name: 'C', min: 0 },
    { name: 'B', min: 0.6 },
    { name: 'A', min: 0.72 },
    { name: 'S', min: 0.8 },
    { name: 'SS', min: 0.9 },
    { name: 'SSS', min: 1 },
    { name: '∞', min: Infinity },
  ],
  infinityMinQuestions: 20,

  timing: {
    /** 正解・不正解を見せてから次の問題に進むまで（ひかえめモードは 1010ms） */
    feedbackMs: 700,
    /** カウントダウンの各段（よーい / 3 / 2 / 1 / GO） */
    countdownMs: [800, 600, 600, 600, 600],
    tierCutinMs: 1500,
    feverEntryMs: 2600,
    /** FEVER の段階アップ（×4・×8・×16）のカットイン */
    feverStageMs: 1500,
    /** コンボ（bandEvery ごと）のカットイン */
    comboCutinMs: 1100,
    /** 正解ごとのミニカットイン（進行は止めない） */
    miniCutinMs: 900,
    bandMs: 1600,
  },

  /** チャレンジ（時間内に何問とけるか） */
  challenge: {
    /** 前もって作っておく問題の数（時間内にこれ以上はとけない） */
    poolSize: 300,
    /** 次の問題に進むまでの ms（れんしゅうより短く、テンポよく） */
    feedbackMs: 450,
    /**
     * ランクの「目安の満点」：とくいな子のペースでといたときの問題数を、時間から決める。
     * 1問の目安の秒数 = parBase + parPerDigit × 答えの桁数（あまりがあれば + parRemainder）
     */
    parBase: 2,
    parPerDigit: 2,
    parRemainder: 3,
    /** ランク値がこれ以上で ∞ */
    infinityValue: 1.12,
    /**
     * チャレンジ用のランクのしきい値（ランク値）。時間が長いほど満点がふくらむので、れんしゅうよりやさしめ。
     * scripts/simulate.ts の試算で決めた（docs/spec.md §7）
     */
    rank: [
      { name: 'C', min: 0 },
      { name: 'B', min: 0.45 },
      { name: 'A', min: 0.58 },
      { name: 'S', min: 0.7 },
      { name: 'SS', min: 0.85 },
      { name: 'SSS', min: 1 },
    ],
    /** のこり何秒から時計を赤くして音を鳴らすか */
    warnSec: 10,
  },

  particles: {
    cap: 1200,
    capFever: 1800,
  },

  /** ゴールデン問題（運のボーナス）。見た目は色と光だけ（聖域に触れない） */
  golden: {
    /** 1問ごとにゴールデンになる確率（スキルで上がる） */
    chance: 0.1,
    /** 正解したときのボーナスタイムの秒数（止められるタイマー。スキルでのびる） */
    bonusSec: 10,
    /** ボーナスタイム中の点数の倍率 */
    bonusMult: 2,
    /** FEVER と重なったとき（W ボーナス）の倍率。スキル「W ボーナス強化」で wBonusMultUp */
    wBonusMult: 2,
    wBonusMultUp: 3,
  },

  /**
   * ごほうび（経験値）。画面の点数は倍々でも、経験値は倍率を capMult までで数える（進む速さを壊さない）。
   * 経験値 = Σ(正解の基本点 × min(capMult, コンボ×FEVER) × ボーナスタイムの倍率) ÷ perXp ＋ 遊びきったぶん playBonus
   * 値は scripts/simulate.ts の試算で決めた（docs/spec.md §10）
   */
  reward: {
    capMult: 2,
    perXp: 10,
    playBonus: 20,
  },

  /** プレイヤーレベル。レベル L → L+1 に必要な経験値 = levelBase + levelStep × (L − 1) */
  level: {
    levelBase: 150,
    levelStep: 60,
  },

  /**
   * コイン（P3）。経験値と同じ「ごほうび用スコア」から出す（倍率は capMult まで）。
   * コイン = ごほうび用スコア ÷ perCoin ＋ 遊びきったぶん playBonus。値は scripts/simulate.ts の試算で決める（docs/spec.md §11）
   */
  coin: {
    perCoin: 40,
    playBonus: 5,
  },

  /** ガチャ（ゲーム内コインだけ）。排出率は画面にも出す */
  gacha: {
    cost: 100,
    /** レア度ごとの排出率（%）。合計 100 */
    rates: { N: 60, R: 30, SR: 8, SSR: 2 },
    /** この回数のうちに SR 以上が出なければ、次は SR 以上が確定（天井） */
    pity: 20,
    /** だぶったら「かけら」1つ。この数で、まだ持っていないものを1つえらんで交換できる */
    shardsPerItem: 10,
    /** 演出の長さ（ミリ秒）。レア度が高いほど長い */
    revealMs: { N: 2000, R: 3000, SR: 4500, SSR: 6500 },
    /** フェイント（いったん止まってから色が上がる）の確率。SR 以上だけ */
    feintChance: 0.35,
  },

  /** デイリーミッション：1日3つ。途切れても罰はなし */
  daily: {
    count: 3,
    /** 1つできたときのコイン */
    reward: 20,
    /** 3つ全部できたときのボーナス */
    allBonus: 60,
    /** その日はじめて遊んだときのコイン = streakCoin × min(連続日数, streakCap) */
    streakCoin: 5,
    streakCap: 7,
  },

  /** 休けいのお知らせ。プレイとプレイのあいだがこの分数より空いたら、連続プレイを数えなおす */
  rest: {
    gapMinutes: 10,
  },
} as const;

export type RankName = (typeof RULES.rank)[number]['name'];

/**
 * 演出のつよさごとの倍率。
 * hype：数字（+点数・飛ぶ文字・ドカッ!）の大きさ、キャラのはね方などの強さ。0 で v2 のまま、1 で最大。
 * miniCutin：正解ごとのミニカットイン。extraCutin：コンボ・FEVER 段階アップも大きなカットインにする。
 */
export const INTENSITY = {
  low: { particles: 0.35, flash: 0, shake: 0, invert: false, bigCutin: false, extraCutin: false, miniCutin: false, hype: 0 },
  normal: { particles: 0.7, flash: 0.5, shake: 0.5, invert: false, bigCutin: true, extraCutin: false, miniCutin: true, hype: 0.5 },
  max: { particles: 1, flash: 1, shake: 1, invert: true, bigCutin: true, extraCutin: true, miniCutin: true, hype: 1 },
} as const;

export type IntensityProfile = (typeof INTENSITY)[keyof typeof INTENSITY];

/** v2 の大きさ a から強化後の大きさ b へ、つよさ（hype 0〜1）で補間する */
export const hypeSize = (p: IntensityProfile, a: number, b: number) => Math.round(a + (b - a) * p.hype);
