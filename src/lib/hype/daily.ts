import { RULES } from './rules';

// デイリーミッション・連続日数・休けいのお知らせ（P3）。
// 日付（'YYYY-MM-DD'）と時刻（ミリ秒）は引数で渡す純粋な関数にする（試算・確認用）。

/** 1プレイの成績（ミッションの進みを数える材料） */
export interface PlayStats {
  mode: 'practice' | 'challenge';
  correct: number;
  total: number;
  maxCombo: number;
  feverCount: number;
  goldenCleared: number;
  defeated: number;
  /** ランクの順番（C = 0 … ∞ = 6） */
  rankIndex: number;
}

export interface MissionDef {
  id: string;
  /** 画面に出す文。{n} は目標の数 */
  text: string;
  target: number;
  /** 1プレイで進む数 */
  gain: (s: PlayStats) => number;
}

export const MISSIONS: MissionDef[] = [
  { id: 'play3', text: '{n}回 あそぶ', target: 3, gain: () => 1 },
  { id: 'correct30', text: '{n}問 正解する', target: 30, gain: (s) => s.correct },
  { id: 'combo10', text: '{n}コンボを出す', target: 10, gain: (s) => s.maxCombo },
  { id: 'fever2', text: 'FEVER に {n}回 入る', target: 2, gain: (s) => s.feverCount },
  { id: 'zombie20', text: 'ゾンビを {n}体 やっつける', target: 20, gain: (s) => s.defeated },
  { id: 'golden1', text: 'ゴールデン問題に正解する', target: 1, gain: (s) => s.goldenCleared },
  { id: 'challenge1', text: 'チャレンジで あそぶ', target: 1, gain: (s) => (s.mode === 'challenge' ? 1 : 0) },
  { id: 'rankA', text: 'A ランク以上をとる', target: 1, gain: (s) => (s.rankIndex >= 2 ? 1 : 0) },
  { id: 'perfect', text: '練習で 全問正解する', target: 1, gain: (s) => (s.mode === 'practice' && s.total > 0 && s.correct === s.total ? 1 : 0) },
];

/** 「いちばんよかった1回」で数えるミッション（合計しない） */
const BEST_OF = new Set(['combo10']);

const DEF = new Map(MISSIONS.map((m) => [m.id, m]));
export const missionById = (id: string) => DEF.get(id);
export const missionText = (m: MissionDef) => m.text.replace('{n}', String(m.target));

/** その日のデイリーの状態（保存データの一部） */
export interface DailyState {
  date: string;
  /** ミッションの ID と進み */
  missions: { id: string; count: number; done: boolean }[];
  /** 3つ全部のボーナスをもらった */
  bonus: boolean;
}

export interface StreakState {
  /** 最後に遊んだ日 */
  last: string;
  count: number;
  best: number;
}

export interface RestState {
  /** 続けて遊びはじめた時刻（ミリ秒）。0 なら記録なし */
  since: number;
  /** 最後にプレイが終わった時刻 */
  last: number;
}

/** 'YYYY-MM-DD'（その端末の日付） */
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 1日前の日付 */
export const prevDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
};

/** 文字列から 32 ビットの数を作る（日付ごとに同じミッションを選ぶため） */
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** その日のミッション（日付で決まる。同じ日なら何度開いても同じ） */
export const missionsFor = (date: string): MissionDef[] => {
  const pool = [...MISSIONS];
  const out: MissionDef[] = [];
  let h = hash(date);
  for (let i = 0; i < RULES.daily.count && pool.length; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    out.push(pool.splice(h % pool.length, 1)[0]);
  }
  return out;
};

/** 今日のデイリー（保存が別の日なら、まっさらな今日のぶん） */
export const dailyFor = (saved: DailyState | undefined, today: string): DailyState =>
  saved && saved.date === today
    ? saved
    : { date: today, missions: missionsFor(today).map((m) => ({ id: m.id, count: 0, done: false })), bonus: false };

export interface DailyResult {
  daily: DailyState;
  /** このプレイで達成したミッション */
  cleared: MissionDef[];
  /** このプレイで3つそろった */
  allClear: boolean;
  coins: number;
}

/** 1プレイぶん進める（新しい状態を返す） */
export const advanceDaily = (saved: DailyState | undefined, today: string, stats: PlayStats): DailyResult => {
  const cur = dailyFor(saved, today);
  const cleared: MissionDef[] = [];
  const missions = cur.missions.map((m) => {
    const def = DEF.get(m.id);
    if (!def || m.done) return { ...m };
    const g = def.gain(stats);
    const count = Math.min(def.target, BEST_OF.has(def.id) ? Math.max(m.count, g) : m.count + g);
    const done = count >= def.target;
    if (done) cleared.push(def);
    return { id: m.id, count, done };
  });
  const allClear = !cur.bonus && missions.length > 0 && missions.every((m) => m.done);
  const coins = cleared.length * RULES.daily.reward + (allClear ? RULES.daily.allBonus : 0);
  return { daily: { date: today, missions, bonus: cur.bonus || allClear }, cleared, allClear, coins };
};

export interface StreakResult {
  streak: StreakState;
  /** 今日はじめてのプレイ */
  firstToday: boolean;
  coins: number;
}

/** 連続日数を進める。途切れたら 1 からやりなおし（罰はなし） */
export const advanceStreak = (s: StreakState, today: string): StreakResult => {
  if (s.last === today) return { streak: { ...s }, firstToday: false, coins: 0 };
  const count = s.last === prevDate(today) ? s.count + 1 : 1;
  const coins = RULES.daily.streakCoin * Math.min(count, RULES.daily.streakCap);
  return { streak: { last: today, count, best: Math.max(s.best, count) }, firstToday: true, coins };
};

/** 画面に出す連続日数（昨日か今日に遊んでいなければ 0） */
export const streakNow = (s: StreakState, today: string) => (s.last === today || s.last === prevDate(today) ? s.count : 0);

export interface RestResult {
  rest: RestState;
  /** お知らせを出す */
  remind: boolean;
  /** 続けて遊んだ分数 */
  minutes: number;
}

/**
 * 休けいの判定（プレイの終わりに呼ぶ）。playMs はこのプレイの長さ。
 * あいだが RULES.rest.gapMinutes より空いたら数えなおす。limitMin = 0 ならお知らせしない。
 * お知らせを出したら、そこからまた数えなおす（しつこくしない）
 */
export const checkRest = (s: RestState, now: number, playMs: number, limitMin: number): RestResult => {
  const gap = RULES.rest.gapMinutes * 60_000;
  const since = s.since > 0 && now - playMs - s.last <= gap ? s.since : now - playMs;
  const minutes = Math.floor((now - since) / 60_000);
  const remind = limitMin > 0 && minutes >= limitMin;
  return { rest: { since: remind ? now : since, last: now }, remind, minutes };
};
