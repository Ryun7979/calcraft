import { RULES } from './rules';
import { advanceDaily, advanceStreak, checkRest, MissionDef, PlayStats } from './daily';
import type { Progress } from '../storage';

// プレイ後のごほうび（P3）：コイン → デイリー → 経験値 を1回の書き込みにまとめる。
// 乱数（ルーレット）・日付・時刻は引数で渡す。

/** ごほうび用スコアからのコイン（倍率は capMult までで数えたスコア） */
export const coinsOfPlay = (reward: number) => Math.round(reward / RULES.coin.perCoin) + RULES.coin.playBonus;

export interface SettleInput {
  stats: PlayStats;
  /** ごほうび用スコア（HypeState.reward） */
  reward: number;
  /** 経験値（ルーレットの前） */
  xpBase: number;
  /** ルーレットの倍率（スキルがなければ null） */
  roulette: number | null;
  today: string;
  now: number;
  playMs: number;
  /** 休けいのお知らせの分数（0 でなし） */
  restMinutes: number;
}

export interface SettleResult {
  xpBefore: number;
  xpGained: number;
  roulette: number | null;
  coinsBefore: number;
  /** プレイのコイン */
  playCoins: number;
  /** ミッションのコイン（全部そろったボーナスもふくむ） */
  missionCoins: number;
  /** 連続日数のコイン（今日はじめてのときだけ） */
  streakCoins: number;
  streak: number;
  cleared: MissionDef[];
  allClear: boolean;
  remindRest: boolean;
  restMinutes: number;
}

/** progress（mutateSave の下書き）を書き換えて、結果を返す */
export const settlePlay = (p: Progress, input: SettleInput): SettleResult => {
  const xpBefore = p.xp;
  const coinsBefore = p.coins;
  const xpGained = Math.round(input.xpBase * (input.roulette ?? 1));
  const playCoins = coinsOfPlay(input.reward);
  const st = advanceStreak(p.streak, input.today);
  const dl = advanceDaily(p.daily, input.today, input.stats);
  const rs = checkRest(p.rest, input.now, input.playMs, input.restMinutes);

  p.coins += playCoins + dl.coins + st.coins;
  p.daily = dl.daily;
  p.streak = st.streak;
  p.rest = rs.rest;
  p.xp += xpGained;

  return {
    xpBefore,
    xpGained,
    roulette: input.roulette,
    coinsBefore,
    playCoins,
    missionCoins: dl.coins,
    streakCoins: st.coins,
    streak: st.streak.count,
    cleared: dl.cleared,
    allClear: dl.allClear,
    remindRest: rs.remind,
    restMinutes: rs.minutes,
  };
};
