// マシマシモードの数値はすべてここに集める。
// 値の根拠は docs/spec.md の「数値の試算」（scripts/simulate.ts で再現できる）。

export const RULES = {
  /** コンボ（連続正解）の段階。tiers[i] 以上で段階 i */
  combo: {
    tiers: [0, 2, 4, 7, 10],
    mult: [1.0, 1.2, 1.5, 2.0, 3.0],
    names: ['', 'ノリノリ！', 'アツい！', 'すごすぎ！', 'かくせい！！'],
    /** この数ごとに上部の帯を出す */
    bandEvery: 5,
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
    tierCutinMs: 1300,
    feverEntryMs: 2400,
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
    cap: 600,
    capFever: 900,
  },
} as const;

export type RankName = (typeof RULES.rank)[number]['name'];

/** 演出のつよさごとの倍率 */
export const INTENSITY = {
  low: { particles: 0.35, flash: 0, shake: 0, invert: false, bigCutin: false },
  normal: { particles: 0.7, flash: 0.5, shake: 0.5, invert: false, bigCutin: true },
  max: { particles: 1, flash: 1, shake: 1, invert: true, bigCutin: true },
} as const;

export type IntensityProfile = (typeof INTENSITY)[keyof typeof INTENSITY];
