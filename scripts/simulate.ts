// マシマシモードの数値の試算。 npx tsx scripts/simulate.ts
// 腕前（正答率・1問にかかる秒数）× 問題数 × 答えの桁数 で、点数・ランク・FEVER 回数の分布を見る。
import { initialHype, hypeAnswer, hypeKey, hypeTick, rankOf, perfectScore, HypeState } from '../src/lib/hype/engine';

const SKILLS_LIST = [
  { name: 'はじめて', acc: 0.5, sec: 15 },
  { name: 'ゆっくり', acc: 0.7, sec: 12 },
  { name: 'ふつう', acc: 0.8, sec: 9 },
  { name: 'とくい', acc: 0.9, sec: 6 },
  { name: 'すごい', acc: 0.97, sec: 4 },
  { name: 'てんさい', acc: 0.99, sec: 2.5 },
];
const COUNTS = [4, 10, 20];
const DIGITS = [2, 3];
const RUNS = 400;

const simulate = (acc: number, sec: number, count: number, digits: number, rnd: () => number) => {
  let s: HypeState = initialHype();
  let fevers = 0;
  for (let q = 0; q < count; q++) {
    // 打鍵は1問の時間に均等に散らす
    for (let k = 0; k < digits; k++) {
      s = hypeTick(s, sec / (digits + 1)).state;
      s = hypeKey(s).state;
    }
    s = hypeTick(s, sec / (digits + 1)).state;
    const r = hypeAnswer(s, rnd() < acc, 10 ** (digits - 1));
    if (r.events.some((e) => e.kind === 'feverStart')) fevers++;
    s = r.state;
    s = hypeTick(s, 0.7).state; // 次の問題までの待ち
  }
  const perfect = perfectScore(Array.from({ length: count }, () => 10 ** (digits - 1)));
  return { score: s.score, rank: rankOf(s.score, perfect, count), fevers, maxCombo: s.maxCombo };
};

let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

const pct = (arr: number[], p: number) => [...arr].sort((a, b) => a - b)[Math.floor((arr.length - 1) * p)];

for (const digits of DIGITS) {
  console.log(`\n=== 答えの桁数 ${digits} ===`);
  for (const count of COUNTS) {
    console.log(`\n-- ${count}問 --`);
    console.log('腕前      | 点数 中央値(10%-90%) | 1問平均 | FEVER平均 | 最大コンボ | ランク分布');
    for (const sk of SKILLS_LIST) {
      const res = Array.from({ length: RUNS }, () => simulate(sk.acc, sk.sec, count, digits, rnd));
      const scores = res.map((r) => r.score);
      const ranks: Record<string, number> = {};
      res.forEach((r) => (ranks[r.rank] = (ranks[r.rank] ?? 0) + 1));
      const rankStr = Object.entries(ranks)
        .sort()
        .map(([k, v]) => `${k}:${Math.round((v / RUNS) * 100)}%`)
        .join(' ');
      const fev = res.reduce((a, r) => a + r.fevers, 0) / RUNS;
      const mc = res.reduce((a, r) => a + r.maxCombo, 0) / RUNS;
      console.log(
        `${sk.name.padEnd(6, '　')} | ${String(pct(scores, 0.5)).padStart(6)} (${pct(scores, 0.1)}-${pct(scores, 0.9)}) | ${String(Math.round(pct(scores, 0.5) / count)).padStart(5)} | ${fev.toFixed(2).padStart(6)} | ${mc.toFixed(1).padStart(5)} | ${rankStr}`,
      );
    }
  }
}

// --- チャレンジ（時間内に何問）。カットイン中は時計が止まるので、ここでは止まらない前提（少しきびしめ）で試算する ---
import { challengeParAnswers, challengeRankOf } from '../src/lib/hype/engine';
console.log('\n=== チャレンジ（答え 2 桁） ===');
for (const minutes of [1, 2, 3]) {
  console.log(`\n-- ${minutes}ぷん --`);
  console.log('腕前      | せいかい数 中央値 | 点数 中央値 | ランク分布');
  const seconds = minutes * 60;
  const pool = Array.from({ length: 300 }, () => ({ answer: 10 }));
  const par = perfectScore(challengeParAnswers(pool, seconds));
  for (const sk of SKILLS_LIST) {
    const res = Array.from({ length: RUNS }, () => {
      let s: HypeState = initialHype();
      let t = 0;
      while (true) {
        const step = sk.sec / 3;
        if (t + sk.sec + 0.45 > seconds) break;
        for (let k = 0; k < 2; k++) {
          s = hypeTick(s, step).state;
          s = hypeKey(s).state;
        }
        s = hypeTick(s, step).state;
        s = hypeAnswer(s, rnd() < sk.acc, 10).state;
        s = hypeTick(s, 0.45).state;
        t += sk.sec + 0.45;
      }
      return { correct: s.correct, score: s.score, rank: challengeRankOf(s.score, par) };
    });
    const ranks: Record<string, number> = {};
    res.forEach((r) => (ranks[r.rank] = (ranks[r.rank] ?? 0) + 1));
    const rankStr = Object.entries(ranks).sort().map(([k, v]) => `${k}:${Math.round((v / RUNS) * 100)}%`).join(' ');
    console.log(`${sk.name.padEnd(6, '　')} | ${String(pct(res.map((r) => r.correct), 0.5)).padStart(4)} | ${String(pct(res.map((r) => r.score), 0.5)).padStart(8)} | ${rankStr}`);
  }
}

// --- P2：経験値・レベル（ゴールデン問題・ボーナスタイム込み）。れんしゅう 10問・答え 2 桁 ---
import { rollGolden, xpOfPlay, rankScore } from '../src/lib/hype/engine';
import { getMods, levelInfo, SKILLS, Mods } from '../src/lib/hype/skills';

const playOnce = (acc: number, sec: number, count: number, mods: Mods) => {
  let s: HypeState = initialHype(mods);
  for (let q = 0; q < count; q++) {
    const golden = rollGolden(s, rnd(), mods);
    if (golden) s = { ...s, goldenSeen: s.goldenSeen + 1 };
    for (let k = 0; k < 2; k++) {
      s = hypeTick(s, sec / 3).state;
      s = hypeKey(s, mods).state;
    }
    s = hypeTick(s, sec / 3).state;
    s = hypeAnswer(s, rnd() < acc, 10, { golden, mods }).state;
    s = hypeTick(s, 0.7).state;
  }
  return s;
};

const ALL = getMods(SKILLS.map((x) => x.id));
const full = SKILLS.length + 1; // 全スキルがそろうレベル
console.log(`\n=== 経験値（れんしゅう 10問・答え 2 桁）。全スキル ${SKILLS.length} 個 = レベル ${full} ===`);
console.log('腕前      | 経験値/回 中央値 | ゴールデン正解/回 | ランク(ボーナス除く)が変わった回 | Lv2 | Lv5 | Lv10 | 全スキル(Lv' + full + ') | 50回でLv');
for (const sk of SKILLS_LIST) {
  const per = Array.from({ length: RUNS }, () => xpOfPlay(playOnce(sk.acc, sk.sec, 10, getMods([]))));
  const gold = Array.from({ length: RUNS }, () => playOnce(sk.acc, sk.sec, 10, getMods([])).goldenCleared);
  // ボーナス分を除かずにランクを出したら変わってしまった割合（除く効果の確認）
  const perfect10 = perfectScore(Array.from({ length: 10 }, () => 10));
  let changed = 0;
  for (let i = 0; i < RUNS; i++) {
    const st = playOnce(sk.acc, sk.sec, 10, getMods([]));
    if (rankOf(st.score, perfect10, 10) !== rankOf(rankScore(st), perfect10, 10)) changed++;
  }
  // 何回遊ぶとそのレベルか（スキルは取った順に効く：半分ほど取った想定で後半を回す）
  const playsTo = (target: number) => {
    let xp = 0;
    for (let n = 1; n <= 500; n++) {
      const lv = levelInfo(xp).level;
      const mods = lv >= 8 ? ALL : getMods([]);
      xp += xpOfPlay(playOnce(sk.acc, sk.sec, 10, mods));
      if (levelInfo(xp).level >= target) return n;
    }
    return 999;
  };
  const med = (f: () => number) => pct(Array.from({ length: 41 }, f), 0.5);
  let xp50 = 0;
  for (let n = 0; n < 50; n++) xp50 += xpOfPlay(playOnce(sk.acc, sk.sec, 10, levelInfo(xp50).level >= 8 ? ALL : getMods([])));
  console.log(
    `${sk.name.padEnd(6, '　')} | ${String(pct(per, 0.5)).padStart(5)} | ${(gold.reduce((a, b) => a + b, 0) / RUNS).toFixed(2).padStart(5)} | ${Math.round((changed / RUNS) * 100)}% | ${med(() => playsTo(2))} | ${med(() => playsTo(5))} | ${med(() => playsTo(10))} | ${med(() => playsTo(full))} | ${levelInfo(xp50).level}`,
  );
}

// --- P3/P4：コイン・ガチャ・デイリー。1日3回（れんしゅう 10問・答え 2 桁）遊ぶ想定で、毎日つづける ---
// 「何回遊ぶと全部そろうか」。かけらは10個たまったら、まだ持っていない中でいちばんレア度の高いものと交換する
import { coinsOfPlay } from '../src/lib/hype/rewards';
import { advanceDaily, advanceStreak, DailyState, StreakState } from '../src/lib/hype/daily';
import { exchangeShards, GACHA_ITEMS, GachaState, pullGacha, RARITIES } from '../src/lib/hype/collection';
import { RULES } from '../src/lib/hype/rules';

const PER_DAY = 3;
const dayKey = (n: number) => {
  const d = new Date(2026, 0, 1 + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const collect = (acc: number, sec: number) => {
  const g: GachaState = { coins: 0, items: [], shards: 0, pity: 0 };
  let daily: DailyState | undefined;
  let streak: StreakState = { last: '', count: 0, best: 0 };
  let firstSR = 0;
  let half = 0;
  let coinsTotal = 0;
  let pulls = 0;
  for (let n = 1; n <= 2000; n++) {
    const today = dayKey(Math.floor((n - 1) / PER_DAY));
    const s = playOnce(acc, sec, 10, getMods([]));
    const perfect10 = perfectScore(Array.from({ length: 10 }, () => 10));
    const rankIndex = RULES.rank.findIndex((r) => r.name === rankOf(rankScore(s), perfect10, 10));
    const st = advanceStreak(streak, today);
    streak = st.streak;
    const dl = advanceDaily(daily, today, {
      mode: 'practice', correct: s.correct, total: 10, maxCombo: s.maxCombo, feverCount: s.feverCount,
      goldenCleared: s.goldenCleared, defeated: s.correct, rankIndex,
    });
    daily = dl.daily;
    const got = coinsOfPlay(s.reward) + dl.coins + st.coins;
    g.coins += got;
    coinsTotal += got;
    while (g.coins >= RULES.gacha.cost) {
      const r = pullGacha(g, rnd)!;
      pulls++;
      if (!firstSR && (r.rarity === 'SR' || r.rarity === 'SSR')) firstSR = n;
    }
    while (g.shards >= RULES.gacha.shardsPerItem) {
      const want = [...GACHA_ITEMS].reverse().find((x) => !g.items.includes(x.id));
      if (!want || !exchangeShards(g, want.id)) break;
    }
    if (!half && g.items.length >= GACHA_ITEMS.length / 2) half = n;
    if (g.items.length >= GACHA_ITEMS.length) return { firstSR, half, all: n, coinsPerPlay: coinsTotal / n, pullsPerPlay: pulls / n };
  }
  return { firstSR, half, all: 2000, coinsPerPlay: coinsTotal / 2000, pullsPerPlay: pulls / 2000 };
};

console.log(`\n=== コイン・ガチャ（1日${PER_DAY}回・れんしゅう 10問）。ガチャ ${RULES.gacha.cost} コイン・${GACHA_ITEMS.length}種（${RARITIES.map((r) => `${r} ${RULES.gacha.rates[r]}%`).join(' / ')}）・天井 ${RULES.gacha.pity} 回 ===`);
console.log('腕前      | コイン/回 | ガチャ/回 | はじめての SR 以上（回目） | 半分そろう | 全部そろう | 全部そろう日数');
for (const sk of SKILLS_LIST) {
  const res = Array.from({ length: 101 }, () => collect(sk.acc, sk.sec));
  const m = (f: (r: (typeof res)[number]) => number) => pct(res.map(f), 0.5);
  console.log(
    `${sk.name.padEnd(6, '　')} | ${m((r) => r.coinsPerPlay).toFixed(0).padStart(5)} | ${m((r) => r.pullsPerPlay).toFixed(2).padStart(5)} | ${String(m((r) => r.firstSR)).padStart(4)} | ${String(m((r) => r.half)).padStart(4)} | ${String(m((r) => r.all)).padStart(4)} (${pct(res.map((r) => r.all), 0.1)}-${pct(res.map((r) => r.all), 0.9)}) | ${Math.ceil(m((r) => r.all) / PER_DAY)}日`,
  );
}
