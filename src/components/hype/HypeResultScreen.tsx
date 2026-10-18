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
import { challengeNextRankInfo, challengeRankOf, nextRankInfo, rankOf } from '../../lib/hype/engine';
import { INTENSITY, RankName, RULES } from '../../lib/hype/rules';
import { hypeAudio } from '../../lib/hype/audio';
import { pickPraise } from '../../lib/hype/praise';
import { bestKey, challengeKey, loadSave, mutateSave } from '../../lib/storage';

interface Props {
  answers: AnsweredQuestion[];
  summary: HypeSummary | null;
  grade: Grade;
  op: Operation;
  intensity: EffectIntensity;
  fx: React.RefObject<FxHandle | null>;
  startGame: (isRetry?: boolean) => void;
  backToMenu: () => void;
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
  C: 'ちょうせんしたのがえらい！',
  B: 'いいかんじ！',
  A: 'すごい！',
  S: 'すごすぎる！！',
  SS: 'てんさいだ！！',
  SSS: 'でんせつ！！',
  '∞': 'むげんだい！！かみさま！？',
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

export const HypeResultScreen: React.FC<Props> = ({ answers, summary, grade, op, intensity, fx, startGame, backToMenu }) => {
  const prof = INTENSITY[intensity];
  const challenge = summary?.mode === 'challenge';
  const minutes = summary?.minutes ?? 1;
  const score = summary?.state.score ?? 0;
  const perfect = summary?.perfect ?? 0;
  const total = answers.length;
  const correct = answers.filter((a) => a.isCorrect).length;
  const rank = challenge ? challengeRankOf(score, perfect) : rankOf(score, perfect, total);
  const rankIndex = RULES.rank.findIndex((r) => r.name === rank);
  const next = challenge ? challengeNextRankInfo(score, perfect) : nextRankInfo(score, perfect);

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

  // 点数の数え上げ → ランク発表
  useEffect(() => {
    hypeAudio.playBgm('result');
    both((h) => h.setBase('charge'));
    boyBubble.current?.say(pickPraise('result'), true);
    window.setTimeout(() => girlBubble.current?.say(challenge ? `${correct}もん せいかい！` : 'どきどき…！', true), 400);
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
          {challenge ? `${minutes}ぷん チャレンジ けっか！` : 'けっか はっぴょう！'}
        </h2>

        {challenge && (
          <div className="text-center">
            <span className="text-2xl font-bold text-white">
              {minutes}ぷんで <span className="mc-title text-5xl text-yellow-300 mx-1">{correct}</span> もん せいかい！
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
                  せいかい <span className="text-yellow-300 text-2xl">{correct}</span>/{total}
                </span>
              )}
              <span>さいだいコンボ <span className="text-yellow-300 text-2xl">{s?.maxCombo ?? 0}</span></span>
              <span>FEVER <span className="text-yellow-300 text-2xl">{s?.feverCount ?? 0}</span>かい</span>
              <span>ゾンビ <span className="text-green-300 text-2xl">{summary?.defeated ?? 0}</span>たい</span>
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
                <span className="hype-sticker px-4 py-1 text-xl">せいかいすう じこベスト！！ {correct}もん</span>
              )}
              {best.isNew && score > 0 && (
                <span className="hype-sticker px-4 py-1 text-xl">じこベスト こうしん！！ {score.toLocaleString()}てん</span>
              )}
              {!best.isNew && best.prev > 0 && (
                <span className="text-lg text-gray-200">
                  じこベストまで あと <span className="text-yellow-300 text-2xl font-bold">{(best.prev - score + 1).toLocaleString()}</span> てん！
                </span>
              )}
              {next ? (
                <span className="text-lg text-gray-200">
                  あと <span className="text-yellow-300 text-2xl font-bold">{next.need.toLocaleString()}</span> てんで{' '}
                  <span className="text-yellow-300 font-bold">{next.name}</span> ランク！
                </span>
              ) : rank === 'SS' ? (
                <span className="text-lg text-gray-200">{challenge ? 'もっと はやく とけたら SSS ランク！' : 'ぜんもんせいかいで SSS ランク！'}</span>
              ) : null}
            </>
          )}
        </div>

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
    </motion.div>
  );
};
