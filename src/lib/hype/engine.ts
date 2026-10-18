import { RULES, RankName } from './rules';
import { Mods, NO_MODS } from './skills';

// マシマシモードの「盛り上がり」の状態。純粋な関数だけで進める（試算スクリプトからも使う）。
// 正解・不正解の判定はしない。判定は useGame の handleAnswer のまま（聖域：入力の正確さ）。

export interface HypeState {
  combo: number;
  maxCombo: number;
  gauge: number;
  fever: boolean;
  /** FEVER の段階 0〜3（×2 / ×4 / ×8 / ×16） */
  feverStage: number;
  /** FEVER に入ってからの正解数（段階アップ用） */
  feverCorrect: number;
  feverCount: number;
  score: number;
  correct: number;
  misses: number;
  keys: number;
  /** ボーナスタイムののこり秒数（0 ならボーナスタイムではない） */
  bonusSec: number;
  /** ゴールデン問題が出た数・正解した数 */
  goldenSeen: number;
  goldenCleared: number;
  /** 点数のうちボーナスタイムで上のせされた分（ランクはこれを除いて決める） */
  bonusScore: number;
  /** ごほうび用スコア（倍率は RULES.reward.capMult まで）。経験値はここから出す */
  reward: number;
  /** おまもり（まちがえてもコンボを守る）ののこり回数 */
  shieldLeft: number;
}

export type HypeEvent =
  | { kind: 'tierUp'; tier: number }
  | { kind: 'comboBand'; combo: number }
  | { kind: 'gaugeMax' }
  | { kind: 'feverStart' }
  | { kind: 'feverStage'; stage: number }
  | { kind: 'feverEnd' }
  | { kind: 'bonusStart'; double: boolean }
  | { kind: 'bonusEnd' }
  | { kind: 'shield' };

export interface HypeResult {
  state: HypeState;
  events: HypeEvent[];
  /** 今回ふえた点数 */
  gained: number;
  /** 今回ふえたゲージ（表示用） */
  gaugeDelta: number;
}

export const initialHype = (mods: Mods = NO_MODS): HypeState => ({
  combo: 0,
  maxCombo: 0,
  gauge: 0,
  fever: false,
  feverStage: 0,
  feverCorrect: 0,
  feverCount: 0,
  score: 0,
  correct: 0,
  misses: 0,
  keys: 0,
  bonusSec: 0,
  goldenSeen: 0,
  goldenCleared: 0,
  bonusScore: 0,
  reward: 0,
  shieldLeft: mods.shield,
});

export const comboTier = (combo: number): number => {
  const tiers = RULES.combo.tiers;
  let t = 0;
  for (let i = 0; i < tiers.length; i++) if (combo >= tiers[i]) t = i;
  return t;
};

export const comboMult = (combo: number) => RULES.combo.mult[comboTier(combo)];
export const feverMult = (s: HypeState) => (s.fever ? RULES.fever.mult[s.feverStage] : 1);

const clampGauge = (g: number) => Math.max(0, Math.min(RULES.gauge.max, g));

/** ゲージを足し、満タンなら FEVER に入る */
const addGauge = (s: HypeState, amount: number, events: HypeEvent[]) => {
  const before = s.gauge;
  s.gauge = clampGauge(s.gauge + amount);
  if (!s.fever && s.gauge >= RULES.gauge.max) {
    events.push({ kind: 'gaugeMax' });
    s.fever = true;
    s.feverStage = 0;
    s.feverCorrect = 0;
    s.feverCount += 1;
    s.gauge = RULES.gauge.max;
    events.push({ kind: 'feverStart' });
  }
  return s.gauge - before;
};

/** 数字を1つ打った（消したときも「操作」としてほめるが、ゲージは打ったときだけ） */
export const hypeKey = (prev: HypeState, mods: Mods = NO_MODS): HypeResult => {
  const s = { ...prev, keys: prev.keys + 1 };
  const events: HypeEvent[] = [];
  const delta = addGauge(s, s.fever ? RULES.fever.key : RULES.gauge.key * mods.gaugeMult, events);
  return { state: s, events, gained: 0, gaugeDelta: delta };
};

export const answerPoints = (answer: number) =>
  RULES.score.base + RULES.score.perDigit * Math.max(1, String(Math.abs(answer)).length);

/** いまのボーナスタイムの倍率（ボーナスタイムでなければ 1。FEVER と重なると W ボーナス） */
export const bonusMult = (s: HypeState, mods: Mods = NO_MODS) =>
  s.bonusSec > 0 ? (s.fever ? mods.wBonusMult : RULES.golden.bonusMult) : 1;

/** ゴールデン問題にするかどうか（乱数は引数で渡す） */
export const rollGolden = (s: HypeState, rnd: number, mods: Mods = NO_MODS) =>
  rnd < mods.goldenChance * (s.bonusSec > 0 ? mods.rushMult : 1);

export interface AnswerOptions {
  /** 大きなカットインの最中なら true。不正解でもコンボ・ゲージを減らさない */
  guarded?: boolean;
  /** ゴールデン問題だった */
  golden?: boolean;
  mods?: Mods;
}

/** こたえた結果を反映する */
export const hypeAnswer = (prev: HypeState, isCorrect: boolean, answer: number, opts: AnswerOptions = {}): HypeResult => {
  const { guarded = false, golden = false, mods = NO_MODS } = opts;
  const s = { ...prev };
  const events: HypeEvent[] = [];
  let gained = 0;
  let gaugeDelta = 0;

  if (isCorrect) {
    const beforeTier = comboTier(s.combo);
    s.combo += 1;
    s.correct += 1;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    const tier = comboTier(s.combo);
    if (tier > beforeTier) events.push({ kind: 'tierUp', tier });
    if (s.combo % RULES.combo.bandEvery === 0) events.push({ kind: 'comboBand', combo: s.combo });

    // 点数は「いまの倍率」で数える（FEVER に入るのは加点のあと）
    const base = answerPoints(answer);
    const mult = comboMult(s.combo) * feverMult(s);
    const bonus = bonusMult(s, mods);
    gained = Math.round(base * mult * bonus);
    s.score += gained;
    s.bonusScore += gained - Math.round(base * mult);
    s.reward += base * Math.min(RULES.reward.capMult, mult) * bonus;
    if (golden) {
      // ボーナスタイムは「次の問題から」。のこっていたら入れなおす
      s.goldenCleared += 1;
      s.bonusSec = mods.bonusSec;
      events.push({ kind: 'bonusStart', double: s.fever });
    }

    if (s.fever) {
      s.feverCorrect += 1;
      gaugeDelta = addGauge(s, RULES.fever.correct, events);
      const stage = Math.min(RULES.fever.mult.length - 1, Math.floor(s.feverCorrect / RULES.fever.stageEvery));
      if (stage > s.feverStage) {
        s.feverStage = stage;
        events.push({ kind: 'feverStage', stage });
      }
    } else {
      gaugeDelta = addGauge(s, RULES.gauge.correct * mods.gaugeMult, events);
    }
  } else {
    s.misses += 1;
    if (!guarded) {
      if (s.shieldLeft > 0 && s.combo > 0) {
        s.shieldLeft -= 1;
        events.push({ kind: 'shield' });
      } else s.combo = 0;
      if (s.fever) {
        const before = s.gauge;
        s.gauge = clampGauge(s.gauge - RULES.fever.miss);
        gaugeDelta = s.gauge - before;
        if (s.gauge <= 0) endFever(s, events);
      } else {
        const before = s.gauge;
        s.gauge = s.gauge * RULES.gauge.keepOnMiss;
        gaugeDelta = s.gauge - before;
      }
    }
  }
  return { state: s, events, gained, gaugeDelta };
};

const endFever = (s: HypeState, events: HypeEvent[]) => {
  s.fever = false;
  s.feverStage = 0;
  s.feverCorrect = 0;
  s.gauge = 0;
  events.push({ kind: 'feverEnd' });
};

/** 時間を進める（FEVER のゲージとボーナスタイムが減る）。止められるタイマーが止まっている間は呼ばない */
export const hypeTick = (prev: HypeState, dtSec: number): HypeResult => {
  if ((!prev.fever && prev.bonusSec <= 0) || dtSec <= 0) return { state: prev, events: [], gained: 0, gaugeDelta: 0 };
  const s = { ...prev };
  const events: HypeEvent[] = [];
  let drain = 0;
  if (s.bonusSec > 0) {
    s.bonusSec = Math.max(0, s.bonusSec - dtSec);
    if (s.bonusSec <= 0) events.push({ kind: 'bonusEnd' });
  }
  if (s.fever) {
    drain = (RULES.gauge.max / RULES.fever.emptySec[s.feverStage]) * dtSec;
    s.gauge = clampGauge(s.gauge - drain);
    if (s.gauge <= 0) endFever(s, events);
  }
  return { state: s, events, gained: 0, gaugeDelta: -drain };
};

/** ランクに使う点数（ゴールデンのボーナス分は除く。運でランクが変わらないように） */
export const rankScore = (s: HypeState) => Math.max(0, s.score - s.bonusScore);

/** 1プレイでもらえる経験値（ルーレットの倍率は結果画面でかける） */
export const xpOfPlay = (s: HypeState) => Math.round(s.reward / RULES.reward.perXp) + RULES.reward.playBonus;

/** その回の問題を全部正解したときの点数（答えを打つ数字も数える。ゲージのスキルも同じに効かせる。ゴールデンは数えない） */
export const perfectScore = (answers: number[], mods: Mods = NO_MODS): number => {
  let s = initialHype(mods);
  for (const a of answers) {
    for (let k = 0; k < String(Math.abs(a)).length; k++) s = hypeKey(s, mods).state;
    s = hypeAnswer(s, true, a, { mods }).state;
  }
  return s.score;
};

export const rankValue = (score: number, perfect: number) =>
  perfect > 0 ? Math.log1p(Math.max(0, score)) / Math.log1p(perfect) : 0;

export const rankOf = (score: number, perfect: number, totalQuestions: number): RankName => {
  if (perfect > 0 && score >= perfect && totalQuestions >= RULES.infinityMinQuestions) return '∞';
  const v = rankValue(score, perfect);
  let name: RankName = 'C';
  for (const r of RULES.rank) if (v >= r.min - 1e-9) name = r.name;
  return name;
};

/** 次のランクまであと何点か。SSS（全問正解）は点数ではなく「ぜんもん せいかい」で案内するので出さない */
export const nextRankInfo = (score: number, perfect: number) => {
  const v = rankValue(score, perfect);
  const next = RULES.rank.find((r) => r.min > v + 1e-9 && r.name !== 'SSS' && r.name !== '∞');
  if (!next) return null;
  const target = Math.ceil(Math.expm1(next.min * Math.log1p(perfect)));
  return { name: next.name, need: Math.max(1, target - score) };
};

// --- チャレンジ ---

const digits = (n: number) => String(Math.abs(n)).length;

/** 1問の目安の秒数（とくいな子のペース） */
export const parSeconds = (answer: number, hasRemainder: boolean) =>
  RULES.challenge.parBase + RULES.challenge.parPerDigit * digits(answer) + (hasRemainder ? RULES.challenge.parRemainder : 0);

/** 時間内に「目安のペース」でとける問題の答え（ランクの満点の計算に使う） */
export const challengeParAnswers = (questions: { answer: number; remainder?: number }[], seconds: number) => {
  const out: number[] = [];
  let t = 0;
  for (const q of questions) {
    t += parSeconds(q.answer, q.remainder !== undefined);
    if (t > seconds) break;
    out.push(q.answer);
  }
  return out;
};

/** チャレンジのランク。目安の満点をこえることもあるので、こえた分で ∞ */
export const challengeRankOf = (score: number, par: number): RankName => {
  const v = rankValue(score, par);
  if (v >= RULES.challenge.infinityValue) return '∞';
  let name: RankName = 'C';
  for (const r of RULES.challenge.rank) if (v >= r.min - 1e-9) name = r.name;
  return name;
};

/** チャレンジで次のランクまであと何点か */
export const challengeNextRankInfo = (score: number, par: number) => {
  const v = rankValue(score, par);
  const next = RULES.challenge.rank.find((r) => r.min > v + 1e-9 && r.name !== 'SSS');
  if (!next) return null;
  const target = Math.ceil(Math.expm1(next.min * Math.log1p(par)));
  return { name: next.name, need: Math.max(1, target - score) };
};
