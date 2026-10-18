// マシマシモードの数値の試算。 npx tsx scripts/simulate.ts
// 腕前（正答率・1問にかかる秒数）× 問題数 × 答えの桁数 で、点数・ランク・FEVER 回数の分布を見る。
import { initialHype, hypeAnswer, hypeKey, hypeTick, rankOf, perfectScore, HypeState } from '../src/lib/hype/engine';

const SKILLS = [
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
    for (const sk of SKILLS) {
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
  for (const sk of SKILLS) {
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
