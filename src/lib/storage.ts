import { Settings } from '../types';

// 保存は localStorage の1キーにまとめる。書き換えは mutateSave() を通す。
const SAVE_KEY = 'calcraft:v1';

export interface SaveData {
  settings: Settings;
  /** 自己ベスト。キーは bestKey() で作る */
  best: Record<string, number>;
}

export const DEFAULT_SETTINGS: Settings = {
  effectMode: 'hype',
  intensity: 'max',
  bgm: true,
  questionCount: 10,
  playMode: 'practice',
  challengeMinutes: 1,
};

const defaultSave = (): SaveData => ({
  settings: { ...DEFAULT_SETTINGS },
  best: {},
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
    },
    best: r.best && typeof r.best === 'object' ? { ...r.best } : {},
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
