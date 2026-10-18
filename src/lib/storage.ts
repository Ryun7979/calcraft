import { Settings } from '../types';
import { SKILLS, SkillId } from './hype/skills';
import { Category, CATEGORIES, GACHA_ITEMS, ItemId, itemById } from './hype/collection';
import { DailyState, missionById, RestState, StreakState } from './hype/daily';

// 保存は localStorage の1キーにまとめる。書き換えは mutateSave() を通す。
const SAVE_KEY = 'calcraft:v1';

export interface SaveData {
  settings: Settings;
  /** 自己ベスト。キーは bestKey() で作る */
  best: Record<string, number>;
  /** マシマシの成長（経験値・スキル・コイン・集めたもの・デイリー） */
  progress: Progress;
}

export interface Progress {
  xp: number;
  skills: SkillId[];
  coins: number;
  /** ガチャで手に入れたもの（はじめのものはふくめない） */
  items: ItemId[];
  /** 装備しているもの（カテゴリごと） */
  equipped: Partial<Record<Category, ItemId>>;
  /** だぶりでたまった「かけら」 */
  shards: number;
  /** 最後に SR 以上が出てから引いた回数（天井） */
  pity: number;
  /** ガチャを引いた回数の合計 */
  pulls: number;
  daily?: DailyState;
  streak: StreakState;
  rest: RestState;
}

export const defaultProgress = (): Progress => ({
  xp: 0,
  skills: [],
  coins: 0,
  items: [],
  equipped: {},
  shards: 0,
  pity: 0,
  pulls: 0,
  streak: { last: '', count: 0, best: 0 },
  rest: { since: 0, last: 0 },
});

export const DEFAULT_SETTINGS: Settings = {
  effectMode: 'hype',
  intensity: 'max',
  bgm: true,
  questionCount: 10,
  playMode: 'practice',
  challengeMinutes: 1,
  restMinutes: 30,
  bgmVolume: 100,
  sfxVolume: 100,
};

const VOLUMES = [0, 25, 50, 75, 100];
const volume = (v: unknown, fallback: Settings['bgmVolume']) => (VOLUMES.includes(v as number) ? (v as Settings['bgmVolume']) : fallback);

const defaultSave = (): SaveData => ({
  settings: { ...DEFAULT_SETTINGS },
  best: {},
  progress: defaultProgress(),
});

/** 足りない項目は初期値で埋める（古い保存データや壊れたデータでも動くように） */
const normalize = (raw: unknown): SaveData => {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<SaveData>;
  const s = (r.settings ?? {}) as Partial<Settings>;
  return {
    settings: {
      effectMode: s.effectMode === 'calm' || s.effectMode === 'hype' ? s.effectMode : base.settings.effectMode,
      intensity: s.intensity === 'low' || s.intensity === 'normal' || s.intensity === 'max' ? s.intensity : base.settings.intensity,
      bgm: typeof s.bgm === 'boolean' ? s.bgm : base.settings.bgm,
      questionCount: s.questionCount === 4 || s.questionCount === 10 || s.questionCount === 20 ? s.questionCount : base.settings.questionCount,
      playMode: s.playMode === 'practice' || s.playMode === 'challenge' ? s.playMode : base.settings.playMode,
      challengeMinutes: s.challengeMinutes === 1 || s.challengeMinutes === 2 || s.challengeMinutes === 3 ? s.challengeMinutes : base.settings.challengeMinutes,
      restMinutes: [0, 15, 30, 45, 60].includes(s.restMinutes as number) ? (s.restMinutes as Settings['restMinutes']) : base.settings.restMinutes,
      bgmVolume: volume(s.bgmVolume, base.settings.bgmVolume),
      sfxVolume: volume(s.sfxVolume, base.settings.sfxVolume),
    },
    best: r.best && typeof r.best === 'object' ? { ...r.best } : {},
    progress: normalizeProgress(r.progress),
  };
};

/** 0 以上の整数（それ以外は 0） */
const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const str = (v: unknown) => (typeof v === 'string' ? v : '');

const normalizeProgress = (raw: unknown): Progress => {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<Progress>;
  const base = defaultProgress();
  const known = new Set<string>(SKILLS.map((x) => x.id));
  const skills = Array.isArray(p.skills) ? p.skills.filter((x): x is SkillId => known.has(x)) : [];
  const gacha = new Set<string>(GACHA_ITEMS.map((x) => x.id));
  const items = Array.isArray(p.items) ? p.items.filter((x): x is ItemId => gacha.has(x)) : [];
  const equipped: Progress['equipped'] = {};
  const eq = (p.equipped && typeof p.equipped === 'object' ? p.equipped : {}) as Record<string, unknown>;
  for (const c of CATEGORIES) {
    const id = eq[c.id];
    if (typeof id === 'string' && itemById(id)?.category === c.id) equipped[c.id] = id;
  }
  const d = p.daily;
  const daily: DailyState | undefined =
    d && typeof d === 'object' && typeof d.date === 'string' && Array.isArray(d.missions)
      ? {
          date: d.date,
          missions: d.missions
            .filter((m) => m && typeof m === 'object' && !!missionById(m.id))
            .map((m) => ({ id: m.id, count: count(m.count), done: m.done === true })),
          bonus: d.bonus === true,
        }
      : undefined;
  const sk = (p.streak && typeof p.streak === 'object' ? p.streak : {}) as Partial<StreakState>;
  const rs = (p.rest && typeof p.rest === 'object' ? p.rest : {}) as Partial<RestState>;
  return {
    ...base,
    xp: count(p.xp),
    skills: [...new Set(skills)],
    coins: count(p.coins),
    items: [...new Set(items)],
    equipped,
    shards: count(p.shards),
    pity: count(p.pity),
    pulls: count(p.pulls),
    daily,
    streak: { last: str(sk.last), count: count(sk.count), best: count(sk.best) },
    rest: { since: count(rs.since), last: count(rs.last) },
  };
};

export const loadSave = (): SaveData => {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    return normalize(text ? JSON.parse(text) : null);
  } catch {
    return defaultSave();
  }
};

export const mutateSave = (fn: (draft: SaveData) => void): SaveData => {
  const data = loadSave();
  fn(data);
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // プライベートモードなどで保存できなくても遊べるようにする
  }
  return data;
};

export const bestKey = (op: string, grade: number, count: number) => `${op}-${grade}-${count}`;
/** チャレンジの自己ベスト（点数と正解数）のキー */
export const challengeKey = (op: string, grade: number, minutes: number) => `challenge-${op}-${grade}-${minutes}m`;
