import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCcw, Home } from 'lucide-react';
import { AnsweredQuestion, EffectIntensity, Grade, Operation } from '../../types';
import { OP_SYMBOLS, pageTransition } from '../../constants';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { FxHandle } from './FxCanvas';
import { PixelChar, PixelCharHandle } from './PixelChar';
import { PraiseBubble, PraiseBubbleHandle } from './PraiseBubble';
import { HypeSummary } from './HypePlayingScreen';
import { challengeNextRankInfo, challengeRankOf, nextRankInfo, rankOf, rankScore, xpOfPlay } from '../../lib/hype/engine';
import { levelInfo, ROULETTE, spinRoulette } from '../../lib/hype/skills';
import { INTENSITY, RankName, RULES } from '../../lib/hype/rules';
import { hypeAudio } from '../../lib/hype/audio';
import { pickPraise } from '../../lib/hype/praise';
import { bestKey, challengeKey, loadSave, mutateSave, Progress } from '../../lib/storage';

interface Props {
  answers: AnsweredQuestion[];
  summary: HypeSummary | null;
  grade: Grade;
  op: Operation;
  intensity: EffectIntensity;
  fx: React.RefObject<FxHandle | null>;
  startGame: (isRetry?: boolean) => void;
  backToMenu: () => void;
  progress: Progress;
  updateProgress: (fn: (p: Progress) => void) => void;
}

const RANK_STYLE: Record<RankName, string> = {
  C: 'bg-gray-500',
  B: 'bg-green-600',
  A: 'bg-blue-600',
  S: 'bg-yellow-500',
  SS: 'bg-orange-500',
  SSS: 'bg-gradient-to-br from-pink-500 via-yellow-400 to-cyan-400',
  '∞': 'bg-gradient-to-br from-fuchsia-600 via-red-500 to-amber-400',
};

const RANK_PRAISE: Record<RankName, string> = {
  C: '挑戦したのがえらい！',
  B: 'いいかんじ！',
  A: 'すごい！',
  S: 'すごすぎる！！',
  SS: '天才だ！！',
  SSS: '伝説！！',
  '∞': '無限大！！神さま！？',
};

type Step = 'count' | 'rank' | 'done';

interface BestResult {
  prev: number;
  isNew: boolean;
  prevCorrect: number;
  isNewCorrect: boolean;
}

// 自己ベストの判定は1プレイにつき1回だけ（StrictMode で effect が2回走っても、2回目で「更新なし」にならないように）
const bestCache = new WeakMap<object, BestResult>();

interface XpResult {
  /** このプレイの前の経験値の合計 */
  before: number;
  /** ルーレットの倍率（スキルがなければ null） */
  roulette: number | null;
  gained: number;
}
// 経験値の加算も1プレイ1回。ルーレットの結果は画面を開いた時点で決めて保存し、見せ方だけ遅らせる
const xpCache = new WeakMap<object, XpResult>();

export const HypeResultScreen: React.FC<Props> = ({ answers, summary, grade, op, intensity, fx, startGame, backToMenu, progress, updateProgress }) => {
  const prof = INTENSITY[intensity];
  const challenge = summary?.mode === 'challenge';
  const minutes = summary?.minutes ?? 1;
  const score = summary?.state.score ?? 0;
  const perfect = summary?.perfect ?? 0;
  const total = answers.length;
  const correct = answers.filter((a) => a.isCorrect).length;
  // ランクはゴールデンのボーナス分を除いた点数で決める（運でランクが変わらないように）
  const rscore = summary ? rankScore(summary.state) : 0;
  const rank = challenge ? challengeRankOf(rscore, perfect) : rankOf(rscore, perfect, total);
  const rankIndex = RULES.rank.findIndex((r) => r.name === rank);
  const next = challenge ? challengeNextRankInfo(rscore, perfect) : nextRankInfo(rscore, perfect);

  const [shown, setShown] = useState(0);
  const [step, setStep] = useState<Step>('count');
  const [best, setBest] = useState<BestResult | null>(null);
  const boyRef = useRef<PixelCharHandle>(null);
  const girlRef = useRef<PixelCharHandle>(null);
  const boyBubble = useRef<PraiseBubbleHandle>(null);
  const girlBubble = useRef<PraiseBubbleHandle>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(step);
  stepRef.current = step;
  const [xpRes, setXpRes] = useState<XpResult | null>(null);
  const [xpShown, setXpShown] = useState(progress.xp);
  const [rouletteFace, setRouletteFace] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const xpInfo = levelInfo(xpShown);

  const both = (fn: (h: PixelCharHandle) => void) => {
    if (boyRef.current) fn(boyRef.current);
    window.setTimeout(() => girlRef.current && fn(girlRef.current), 100);
  };

  // 自己ベスト（1回だけ保存）
  useEffect(() => {
    const cacheKey = summary?.state ?? {};
    let result = bestCache.get(cacheKey);
    if (!result) {
      const key = challenge ? challengeKey(op, grade, minutes) : bestKey(op, grade, total);
      const save = loadSave();
      const prev = save.best[key] ?? 0;
      const prevCorrect = save.best[`${key}-correct`] ?? 0;
      result = { prev, isNew: score > prev, prevCorrect, isNewCorrect: challenge && correct > prevCorrect };
      const r = result;
      mutateSave((d) => {
        if (r.isNew) d.best[key] = score;
        if (r.isNewCorrect) d.best[`${key}-correct`] = correct;
      });
      bestCache.set(cacheKey, result);
    }
    setBest(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 経験値（1回だけ保存）
  useEffect(() => {
    if (!summary) return;
    let r = xpCache.get(summary.state);
    if (!r) {
      const base = xpOfPlay(summary.state);
      const roulette = summary.mods.roulette ? spinRoulette() : null;
      const gained = Math.round(base * (roulette ?? 1));
      r = { before: progress.xp, roulette, gained };
      xpCache.set(summary.state, r);
      updateProgress((p) => {
        p.xp += gained;
      });
    }
    setXpRes(r);
    setXpShown(r.before);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ランク発表のあと：（ルーレット →）経験値バーが伸びる → レベルアップ
  useEffect(() => {
    if (step !== 'done' || !xpRes) return;
    let raf = 0;
    const timers: number[] = [];
    let spin = 0;
    const celebrate = (lv: number) => {
      setLevelUp(lv);
      hypeAudio.levelUp();
      fx.current?.confetti(140);
      for (let i = 0; i < 8; i++)
        timers.push(window.setTimeout(() => fx.current?.firework(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.5), i * 110));
      fx.current?.flash('#ffffff', 0.4, 200, true);
      both((h) => h.play('jump'));
      boyBubble.current?.say(pickPraise('levelUp'), true);
      timers.push(window.setTimeout(() => girlBubble.current?.say('スキルポイントゲット！', true), 300));
      timers.push(window.setTimeout(() => setLevelUp((cur) => (cur === lv ? null : cur)), 2200));
    };
    const grow = () => {
      const start = performance.now();
      const dur = 1400;
      let lastLevel = levelInfo(xpRes.before).level;
      let lastTick = 0;
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / dur);
        const xp = xpRes.before + xpRes.gained * (1 - Math.pow(1 - k, 2));
        setXpShown(xp);
        const lv = levelInfo(xp).level;
        if (lv > lastLevel) {
          lastLevel = lv;
          celebrate(lv);
        }
        if (now - lastTick > 60 && k < 1) {
          hypeAudio.xpTick(k);
          lastTick = now;
        }
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (xpRes.roulette !== null) {
      // ルーレット：くるくる回って止まる
      let i = 0;
      spin = window.setInterval(() => {
        setRouletteFace(ROULETTE[i++ % ROULETTE.length]);
        hypeAudio.tick();
      }, 80);
      timers.push(
        window.setTimeout(() => {
          window.clearInterval(spin);
          setRouletteFace(xpRes.roulette);
          hypeAudio.select();
          if ((xpRes.roulette ?? 1) > 1) fx.current?.bang(`×${xpRes.roulette}!!`, window.innerWidth / 2, window.innerHeight * 0.45, '#7dff6a', 48);
          timers.push(window.setTimeout(grow, 400));
        }, 1300),
      );
    } else timers.push(window.setTimeout(grow, 300));
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(spin);
      timers.forEach((t) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, xpRes]);

  // 点数の数え上げ → ランク発表
  useEffect(() => {
    hypeAudio.playBgm('result');
    both((h) => h.setBase('charge'));
    boyBubble.current?.say(pickPraise('result'), true);
    window.setTimeout(() => girlBubble.current?.say(challenge ? `${correct}問正解！` : 'どきどき…！', true), 400);
    const start = performance.now();
    const dur = 1500;
    let raf = 0;
    let lastTick = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / dur);
      setShown(Math.round(score * (1 - Math.pow(1 - k, 3))));
      if (now - lastTick > 70 && k < 1) {
        hypeAudio.tick();
        lastTick = now;
      }
      if (k < 1) raf = requestAnimationFrame(tick);
      else setStep('rank');
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== 'rank') return;
    hypeAudio.rank(rankIndex);
    const r = badgeRef.current?.getBoundingClientRect();
    const cx = r ? r.left + r.width / 2 : window.innerWidth / 2;
    const cy = r ? r.top + r.height / 2 : window.innerHeight / 2;
    fx.current?.setIntensity(prof);
    fx.current?.burst(cx, cy, { count: 60 + rankIndex * 20, speed: 12, size: 11 });
    fx.current?.ring(cx, cy, '#ffffff', 260);
    fx.current?.ring(cx, cy, '#ffe14d', 180);
    fx.current?.bang(rank, cx + 90, cy - 70, '#ffe14d', 40);
    fx.current?.flash('#ffffff', 0.45, 220, true);
    if (rankIndex >= 2) {
      for (let i = 0; i < 4 + rankIndex * 3; i++)
        window.setTimeout(() => fx.current?.firework(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.5), i * 120);
      fx.current?.confetti(60 + rankIndex * 30);
    }
    both((h) => {
      h.setBase(rankIndex >= 3 ? 'feverDance' : 'idle');
      h.play('jump');
    });
    boyBubble.current?.say(RANK_PRAISE[rank], true);
    window.setTimeout(() => girlBubble.current?.say(RANK_PRAISE[rank], true), 300);
    const t = window.setTimeout(() => {
      setStep('done');
      if ((best?.isNew && score > 0) || best?.isNewCorrect) {
        hypeAudio.best();
        boyBubble.current?.say(pickPraise('best'), true);
        girlBubble.current?.say(pickPraise('best'), true);
        fx.current?.confetti(120);
        both((h) => h.play('jump'));
      }
    }, 1400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Enter 一発でもう一回（数え上げ中に押したら飛ばす）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (stepRef.current === 'count') {
        setShown(score);
        setStep('rank');
      } else {
        startGame(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [score, startGame]);

  const s = summary?.state;

  return (
    <motion.div key="hype-result" {...pageTransition} className="w-full h-full relative flex items-center justify-center p-4 bg-stone">
      {/* 左右にふたり（大きく） */}
      <div className="absolute left-0 bottom-0 h-[58%] aspect-[40/42] z-[65] pointer-events-none">
        <PixelChar ref={boyRef} who="boy" className="w-full h-full" />
        <div className="absolute left-1/2 bottom-[66%] -translate-x-1/2">
          <PraiseBubble ref={boyBubble} tail="bottom" />
        </div>
      </div>
      <div className="absolute right-0 bottom-0 h-[58%] aspect-[40/42] z-[65] pointer-events-none">
        <PixelChar ref={girlRef} who="girl" className="w-full h-full" />
        <div className="absolute left-1/2 bottom-[66%] -translate-x-1/2">
          <PraiseBubble ref={girlBubble} tail="bottom" />
        </div>
      </div>

      <div className="mc-panel relative z-10 w-full max-w-3xl max-h-[94vh] flex flex-col gap-3 !bg-black/80 !p-4">
        <h2 className="mc-title text-2xl md:text-3xl text-yellow-400 text-center">
          {challenge ? `${minutes}分チャレンジ けっか発表！` : 'けっか発表！'}
        </h2>

        {challenge && (
          <div className="text-center">
            <span className="text-2xl font-bold text-white">
              {minutes}分で <span className="mc-title text-5xl text-yellow-300 mx-1">{correct}</span> 問正解！
            </span>
          </div>
        )}

        <div className="flex items-center justify-center gap-8">
          <div className="flex flex-col items-center">
            <span className="text-sm text-yellow-200 tracking-widest">SCORE</span>
            <span className="mc-title text-4xl md:text-5xl text-white">{shown.toLocaleString()}</span>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-lg font-bold whitespace-nowrap">
              {!challenge && (
                <span>
                  正解 <span className="text-yellow-300 text-2xl">{correct}</span>/{total}
                </span>
              )}
              <span>最大コンボ <span className="text-yellow-300 text-2xl">{s?.maxCombo ?? 0}</span></span>
              <span>FEVER <span className="text-yellow-300 text-2xl">{s?.feverCount ?? 0}</span>回</span>
              <span>ゾンビ <span className="text-green-300 text-2xl">{summary?.defeated ?? 0}</span>体</span>
            </div>
          </div>

          <div className="w-40 h-40 flex items-center justify-center">
            <AnimatePresence>
              {step !== 'count' && (
                <motion.div
                  ref={badgeRef}
                  initial={{ scale: 5, opacity: 0, rotate: -40 }}
                  animate={{ scale: 1, opacity: 1, rotate: -8 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 12 }}
                  className={cn('hype-rank w-36 h-36 flex flex-col items-center justify-center', RANK_STYLE[rank])}
                >
                  <span className="text-[10px] tracking-widest">RANK</span>
                  <span className={rank.length >= 3 ? 'text-4xl' : 'text-6xl'}>{rank}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="min-h-[2.5rem] flex flex-col items-center justify-center gap-1 text-center">
          {step === 'done' && best && (
            <>
              {challenge && best.isNewCorrect && (
                <span className="hype-sticker px-4 py-1 text-xl">正解数 自己ベスト！！ {correct}問</span>
              )}
              {best.isNew && score > 0 && (
                <span className="hype-sticker px-4 py-1 text-xl">自己ベスト更新！！ {score.toLocaleString()}点</span>
              )}
              {!best.isNew && best.prev > 0 && (
                <span className="text-lg text-gray-200">
                  自己ベストまで あと <span className="text-yellow-300 text-2xl font-bold">{(best.prev - score + 1).toLocaleString()}</span> 点！
                </span>
              )}
              {next ? (
                <span className="text-lg text-gray-200">
                  あと <span className="text-yellow-300 text-2xl font-bold">{next.need.toLocaleString()}</span> 点で{' '}
                  <span className="text-yellow-300 font-bold">{next.name}</span> ランク！
                </span>
              ) : rank === 'SS' ? (
                <span className="text-lg text-gray-200">{challenge ? 'もっと速く解けたら SSS ランク！' : '全問正解で SSS ランク！'}</span>
              ) : null}
            </>
          )}
        </div>

        {/* 経験値とプレイヤーレベル */}
        {xpRes && (
          <div className="flex items-center gap-3 px-1">
            <span className="mc-title text-xl text-yellow-300 whitespace-nowrap">Lv {xpInfo.level}</span>
            <div className="hype-gauge flex-1 h-7 relative overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-300" style={{ width: `${(xpInfo.into / xpInfo.need) * 100}%` }} />
            </div>
            <span className="text-lg font-bold whitespace-nowrap">
              経験値 <span className="text-green-300 text-2xl">+{xpRes.gained.toLocaleString()}</span>
            </span>
            {xpRes.roulette !== null && (
              <span className="hype-golden-tag px-2 text-lg whitespace-nowrap">
                ルーレット ×{step === 'done' && rouletteFace !== null ? rouletteFace : '?'}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 pr-1 min-h-0">
          {answers.map((ans, i) => (
            <div
              key={i}
              className={cn(
                'mc-panel !py-2 !px-3 flex items-center justify-between',
                ans.isCorrect ? '!border-green-500 !bg-green-900/60' : '!border-yellow-500 !bg-yellow-900/50',
              )}
            >
              <span className="text-lg font-bold text-white">
                <span className="text-gray-400 text-sm mr-2">Q{i + 1}</span>
                {ans.num1} {OP_SYMBOLS[ans.op]} {ans.num2} = {ans.answer}
                {ans.op === 'div' && ans.remainder !== undefined && <span className="text-yellow-300 ml-1">あまり {ans.remainder}</span>}
              </span>
              <span className="text-base font-bold">
                {ans.isCorrect ? (
                  <span className="text-green-400">○ ばっちり！</span>
                ) : (
                  <span className="text-yellow-300">
                    {ans.userAnswer !== null ? ans.userAnswer : 'パス'}
                    {ans.op === 'div' && ans.remainder !== undefined && ans.userAnswer !== null ? ` あまり ${ans.userRemainder ?? 'ー'}` : ''} → おしい！
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 h-14">
          <Button variant="orange" onClick={() => startGame(true)} className="text-xl flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            もういちど！（Enter）
          </Button>
          <Button variant="blue" onClick={backToMenu} className="text-xl flex items-center gap-2">
            <Home className="w-5 h-5" />
            タイトル
          </Button>
        </div>
      </div>

      {/* レベルアップ（クリックは下に通す） */}
      <div className="absolute inset-0 z-[90] pointer-events-none flex items-center justify-center">
        <AnimatePresence>
          {levelUp !== null && (
            <motion.div
              key={levelUp}
              initial={{ scale: 4, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: -4 }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 14 }}
              className="flex flex-col items-center gap-2"
            >
              <span className="hype-quake hype-shout hype-shout-rainbow text-7xl md:text-[9rem] leading-none">LEVEL UP!!</span>
              <span className="hype-shout text-4xl md:text-6xl">Lv {levelUp}</span>
              <span className="hype-golden-tag px-4 py-1 text-2xl">スキルポイント +1 ／ タイトルの「スキル」で使おう！</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
