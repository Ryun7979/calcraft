import { RULES } from './rules';

// スキルツリー（React 非依存）。レベルが上がるとスキルポイントが1つ。振り直しは無料。
// 聖域（入力・判定・問題）に関わることはスキルで縛らない。モードもレベルで閉じない。
// スキルの効き目は getMods() が返す1つの型に集める。スキルを足すときは SKILLS に1行足し、getMods に効き目を書く。

export type SkillBranch = 'boost' | 'show' | 'play';

export type SkillId =
  | 'gauge1'
  | 'gauge2'
  | 'lucky1'
  | 'lucky2'
  | 'longBonus'
  | 'shield'
  | 'fwStar'
  | 'fwHeart'
  | 'praisePlus'
  | 'galaxy'
  | 'wBonus'
  | 'roulette'
  | 'goldRush';

export interface SkillDef {
  id: SkillId;
  branch: SkillBranch;
  name: string;
  desc: string;
  /** これを先に取っていないと取れない */
  needs?: SkillId;
}

export const BRANCHES: { id: SkillBranch; name: string; desc: string }[] = [
  { id: 'boost', name: 'ブースト', desc: 'ちょっと有利になる' },
  { id: 'show', name: 'えんしゅつ', desc: '見た目がもっと派手に' },
  { id: 'play', name: 'あそび', desc: 'あたらしい楽しみ' },
];

export const SKILLS: SkillDef[] = [
  { id: 'gauge1', branch: 'boost', name: 'ためる力', desc: 'FEVER ゲージが 1.25 倍たまる' },
  { id: 'gauge2', branch: 'boost', name: 'ためる力 II', desc: 'FEVER ゲージが 1.5 倍たまる', needs: 'gauge1' },
  { id: 'lucky1', branch: 'boost', name: 'ラッキー', desc: 'ゴールデン問題が出やすい（15%）' },
  { id: 'lucky2', branch: 'boost', name: 'ラッキー II', desc: 'ゴールデン問題がもっと出やすい（20%）', needs: 'lucky1' },
  { id: 'longBonus', branch: 'boost', name: 'ロングボーナス', desc: 'ボーナスタイムが 15 秒になる' },
  { id: 'shield', branch: 'boost', name: 'おまもり', desc: 'まちがえてもコンボを1回だけ守る' },
  { id: 'fwStar', branch: 'show', name: 'ほし花火', desc: '花火に ★ の形がまざる' },
  { id: 'fwHeart', branch: 'show', name: 'ハート花火', desc: '花火に ♥ の形がまざる', needs: 'fwStar' },
  { id: 'praisePlus', branch: 'show', name: 'ほめことば＋', desc: 'ほめことばが増える' },
  { id: 'galaxy', branch: 'show', name: 'ギャラクシー', desc: 'FEVER の背景が宇宙の色になる' },
  { id: 'wBonus', branch: 'play', name: 'W ボーナス強化', desc: 'FEVER 中のボーナスタイムが ×3' },
  { id: 'roulette', branch: 'play', name: 'ボーナスルーレット', desc: '結果発表で経験値ルーレット（×1〜×2）' },
  { id: 'goldRush', branch: 'play', name: 'ゴールドラッシュ', desc: 'ボーナスタイム中はゴールデンが出やすい', needs: 'roulette' },
];

export const skillById = (id: SkillId) => SKILLS.find((s) => s.id === id)!;

/** スキルの効き目（ゲームの各所はこれだけを見る） */
export interface Mods {
  /** FEVER ゲージのたまり方の倍率（FEVER の外で、打鍵と正解に効く） */
  gaugeMult: number;
  goldenChance: number;
  bonusSec: number;
  /** まちがえてもコンボを守れる回数（1プレイ） */
  shield: number;
  /** FEVER と重なったボーナスタイムの倍率 */
  wBonusMult: number;
  roulette: boolean;
  /** ボーナスタイム中のゴールデンの確率の倍率 */
  rushMult: number;
  fireworkShapes: ('star' | 'heart')[];
  praisePlus: boolean;
  galaxy: boolean;
}

export const getMods = (skills: readonly SkillId[] = []): Mods => {
  const has = (id: SkillId) => skills.includes(id);
  const shapes: Mods['fireworkShapes'] = [];
  if (has('fwStar')) shapes.push('star');
  if (has('fwHeart')) shapes.push('heart');
  return {
    gaugeMult: has('gauge2') ? 1.5 : has('gauge1') ? 1.25 : 1,
    goldenChance: has('lucky2') ? 0.2 : has('lucky1') ? 0.15 : RULES.golden.chance,
    bonusSec: has('longBonus') ? 15 : RULES.golden.bonusSec,
    shield: has('shield') ? 1 : 0,
    wBonusMult: has('wBonus') ? RULES.golden.wBonusMultUp : RULES.golden.wBonusMult,
    roulette: has('roulette'),
    rushMult: has('goldRush') ? 2 : 1,
    fireworkShapes: shapes,
    praisePlus: has('praisePlus'),
    galaxy: has('galaxy'),
  };
};

export const NO_MODS: Mods = getMods([]);

// --- 経験値とレベル ---

/** レベル L から L+1 に上がるのに必要な経験値 */
export const xpForNext = (level: number) => RULES.level.levelBase + RULES.level.levelStep * (level - 1);

/** 経験値の合計から、レベルと「いまのレベルの中での経験値」を出す */
export const levelInfo = (totalXp: number) => {
  let level = 1;
  let rest = Math.max(0, Math.floor(totalXp));
  while (rest >= xpForNext(level)) {
    rest -= xpForNext(level);
    level += 1;
  }
  return { level, into: rest, need: xpForNext(level) };
};

/** 使えるスキルポイント（レベル1で0、レベルが上がるごとに1） */
export const skillPoints = (totalXp: number, skills: readonly SkillId[]) => levelInfo(totalXp).level - 1 - skills.length;

export const canLearn = (id: SkillId, totalXp: number, skills: readonly SkillId[]) => {
  if (skills.includes(id)) return false;
  const def = skillById(id);
  if (def.needs && !skills.includes(def.needs)) return false;
  return skillPoints(totalXp, skills) > 0;
};

/** スキルを外す（そのスキルが前提のものもいっしょに外す） */
export const forgetSkill = (id: SkillId, skills: readonly SkillId[]): SkillId[] => {
  const drop = new Set<SkillId>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const s of SKILLS) if (s.needs && drop.has(s.needs) && !drop.has(s.id)) {
      drop.add(s.id);
      grew = true;
    }
  }
  return skills.filter((s) => !drop.has(s));
};

/**
 * ボーナスルーレットの倍率。結果は画面を開いた時点で決めて保存し、見せ方だけ遅らせる。
 * rnd は試算・確認用に差しかえられる
 */
export const ROULETTE = [1, 1.2, 1.5, 2] as const;
export const ROULETTE_WEIGHT = [40, 30, 20, 10] as const;
export const spinRoulette = (rnd: () => number = Math.random): number => {
  const total = ROULETTE_WEIGHT.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < ROULETTE.length; i++) {
    r -= ROULETTE_WEIGHT[i];
    if (r < 0) return ROULETTE[i];
  }
  return ROULETTE[0];
};
