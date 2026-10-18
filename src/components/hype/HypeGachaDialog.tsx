import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Coins, Gem, RotateCcw, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { FxHandle } from './FxCanvas';
import { ItemIcon, RarityTag } from './HypeZukanDialog';
import { capsuleUrl } from '../../lib/hype/assets';
import { GACHA_ITEMS, pullGacha, PullResult, RARITIES, Rarity } from '../../lib/hype/collection';
import { RULES } from '../../lib/hype/rules';
import { hypeAudio } from '../../lib/hype/audio';
import { Progress } from '../../lib/storage';

// ガチャ（ゲーム内コインだけ）。結果はボタンを押した時点で決めて保存し、見せ方だけ遅らせる。
// カプセルが落ちてゆれ、色が 白 → 青 → 金 → にじ と上がる。長さはレア度で変わる。クリック・Enter で飛ばせる。

interface Props {
  progress: Progress;
  updateProgress: (fn: (p: Progress) => void) => void;
  fx: React.RefObject<FxHandle | null>;
  /** 出たものをキャラにほめさせる */
  onResult: (r: PullResult) => void;
  onClose: () => void;
}

type Phase = 'idle' | 'play' | 'reveal';

/** カプセルの色の段階（0 白・1 青・2 金・3 にじ） */
const CAP = [
  { cap: '#ffffff', glow: 'rgba(255,255,255,0.4)' },
  { cap: '#3a7ae8', glow: 'rgba(58,122,232,0.8)' },
  { cap: '#ffd23c', glow: 'rgba(255,210,60,0.95)' },
  { cap: '#ff4d4d', glow: 'rgba(255,120,255,1)' },
];

export const HypeGachaDialog: React.FC<Props> = ({ progress, updateProgress, fx, onResult, onClose }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [stage, setStage] = useState(0);
  const [wait, setWait] = useState(false);
  const [result, setResult] = useState<PullResult | null>(null);
  const timers = useRef<number[]>([]);
  const capRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const cost = RULES.gacha.cost;
  const enough = progress.coins >= cost;
  const pityLeft = RULES.gacha.pity - progress.pity;

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  /** 中身を見せる（演出の最後・飛ばしたとき） */
  const reveal = useCallback(
    (r: PullResult) => {
      clearTimers();
      const ri = RARITIES.indexOf(r.rarity);
      setStage(ri);
      setWait(false);
      setPhase('reveal');
      hypeAudio.gachaReveal(ri);
      const el = capRef.current?.getBoundingClientRect();
      const x = el ? el.left + el.width / 2 : window.innerWidth / 2;
      const y = el ? el.top + el.height / 2 : window.innerHeight / 2;
      fx.current?.burst(x, y, { count: 50 + ri * 40, speed: 9 + ri * 2, size: 10, sprites: ['diamond', 'emerald', 'star', 'coin'] });
      fx.current?.ring(x, y, CAP[ri].cap, 180 + ri * 60);
      fx.current?.flash('#ffffff', 0.25 + ri * 0.1, 200, ri >= 2);
      if (ri >= 2) {
        for (let i = 0; i < 4 + ri * 4; i++)
          timers.current.push(window.setTimeout(() => fx.current?.firework(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.5), i * 120));
        fx.current?.confetti(60 * ri);
      }
      if (ri >= 3) fx.current?.bang('SSR!!', x + 120, y - 90, '#ffe14d', 56);
      onResult(r);
    },
    [fx, onResult],
  );

  const pull = () => {
    if (phase === 'play') return;
    let r: PullResult | null = null;
    updateProgress((p) => {
      r = pullGacha(p);
      if (r) p.pulls += 1;
    });
    const res = r as PullResult | null;
    if (!res) return;
    clearTimers();
    setResult(res);
    setStage(0);
    setWait(false);
    setPhase('play');
    hypeAudio.gachaTurn();

    // 演出の段取り：落ちる → ゆれる → 色が1段ずつ上がる（フェイントなら一度止まる）→ 開く
    const top = RARITIES.indexOf(res.rarity);
    const total = RULES.gacha.revealMs[res.rarity] + (res.feint ? 1200 : 0);
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    at(450, () => hypeAudio.capsuleDrop());
    at(900, () => hypeAudio.capsuleShake());
    at(1300, () => hypeAudio.capsuleShake());
    const upStart = 1500;
    const upEnd = total - 500;
    for (let s = 1; s <= top; s++) {
      const t = upStart + ((upEnd - upStart) * s) / (top + 1);
      // フェイント：最後の1段の前に、いったん止まってしずかになる（total を 1200 のばした分）
      if (res.feint && s === top) at(t - 1200, () => setWait(true));
      at(t, () => {
        setWait(false);
        setStage(s);
        hypeAudio.capsuleUp(s);
        hypeAudio.capsuleShake();
      });
    }
    at(total, () => reveal(res));
  };

  // クリック・Enter で飛ばす／Escape で閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phaseRef.current !== 'play') onClose();
      if (e.key === 'Enter' && phaseRef.current === 'play' && result) {
        e.preventDefault();
        reveal(result);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, reveal, result]);

  const rarityCount = (r: Rarity) => GACHA_ITEMS.filter((x) => x.rarity === r).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
      onClick={() => (phase === 'play' && result ? reveal(result) : phase !== 'play' && onClose())}
      role="dialog"
      aria-modal="true"
      aria-label="ガチャ"
    >
      <Panel className="w-full max-w-5xl !bg-[#262626] space-y-3 relative" onClick={(e) => {
        e.stopPropagation();
        if (phase === 'play' && result) reveal(result);
      }}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="mc-title text-2xl text-yellow-400">ガチャ</h2>
          <span className="hype-golden-tag px-3 py-0.5 text-xl flex items-center gap-2 whitespace-nowrap">
            <Coins className="w-5 h-5" />
            {progress.coins.toLocaleString()} コイン
          </span>
          <Button onClick={onClose} disabled={phase === 'play'} className="w-12 h-12 !p-0" aria-label="閉じる">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
          {/* カプセルの舞台 */}
          <div className="relative h-[340px] border-4 border-black bg-gradient-to-b from-indigo-950 to-purple-900 overflow-hidden flex items-center justify-center">
            {phase === 'idle' && (
              <div className="flex flex-col items-center gap-3 text-white">
                <div className="hype-capsule-img w-28 h-28 opacity-80" style={{ backgroundImage: `url(${capsuleUrl(0)})` }} />
                <span className="text-xl font-bold">コインで ガチャを まわそう！</span>
              </div>
            )}
            {phase === 'play' && (
              <>
                <motion.div
                  key="drop"
                  initial={{ y: -320 }}
                  animate={{ y: [-320, 0, -40, 0] }}
                  transition={{ duration: 0.8, times: [0, 0.6, 0.8, 1], ease: 'easeIn' }}
                >
                  <motion.div
                    ref={capRef}
                    animate={wait ? { rotate: [0, -3, 3, 0] } : { rotate: [0, -14, 14, -10, 10, 0], scale: [1, 1.04, 1] }}
                    transition={{ duration: wait ? 1.2 : 0.5, repeat: Infinity, delay: 0.8 }}
                    className={cn('hype-capsule-img w-40 h-40', stage === 3 && 'hype-capsule-img-rainbow')}
                    style={{ backgroundImage: `url(${capsuleUrl(stage)})`, ['--cap-glow' as string]: CAP[stage].glow }}
                  />
                </motion.div>
                <span className="absolute bottom-3 text-sm text-gray-300">クリック・Enter で とばす</span>
                {wait && <span className="absolute top-6 text-3xl font-bold text-white">……</span>}
              </>
            )}
            <AnimatePresence>
              {phase === 'reveal' && result && (
                <motion.div
                  key="reveal"
                  ref={capRef}
                  initial={{ scale: 0.2, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                  className="flex flex-col items-center gap-2"
                >
                  <RarityTag rarity={result.rarity} className="text-2xl px-4" />
                  <ItemIcon item={result.item} className="w-44 h-32 bg-black/40 border-4 border-black" />
                  <span className="mc-title text-2xl text-white">{result.item.name}</span>
                  {result.dup ? (
                    <span className="text-lg font-bold text-cyan-200 flex items-center gap-1">
                      <Gem className="w-5 h-5" />
                      もう持ってた！ → かけら +1（{progress.shards}/{RULES.gacha.shardsPerItem}）
                    </span>
                  ) : (
                    <span className="hype-sticker px-3 text-xl">NEW!!</span>
                  )}
                  {result.byPity && <span className="text-sm text-yellow-200">天井で SR 以上 確定！</span>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 引くボタン・排出率・天井 */}
          <div className="flex flex-col gap-2">
            <div className="mc-panel !bg-black/40 !p-3 space-y-1">
              <h3 className="text-lg font-bold text-white">出るもの（{GACHA_ITEMS.length}種）</h3>
              {RARITIES.map((r) => (
                <div key={r} className="flex items-center justify-between text-base">
                  <RarityTag rarity={r} className="text-sm w-12 text-center" />
                  <span className="text-gray-200">{rarityCount(r)}種</span>
                  <span className="font-bold text-white w-14 text-right">{RULES.gacha.rates[r]}%</span>
                </div>
              ))}
              <p className="text-sm text-yellow-200 pt-1">
                あと <span className="text-xl font-bold">{pityLeft}</span> 回で SR 以上 確定！
              </p>
              <p className="text-sm text-cyan-200">
                だぶりは かけら に。{RULES.gacha.shardsPerItem}個で ずかん から好きなものと交換。
              </p>
            </div>
            {phase === 'reveal' && result && (
              <p className="text-center text-sm text-gray-300 flex items-center justify-center gap-1">
                <Check className="w-4 h-4 text-green-400" />
                ずかんで そうび できるよ
              </p>
            )}
            <Button
              variant={enough ? 'orange' : 'default'}
              disabled={!enough || phase === 'play'}
              onClick={(e) => {
                e.stopPropagation();
                pull();
              }}
              className={cn('h-16 text-2xl gap-2 whitespace-nowrap mt-auto', enough && phase !== 'play' && 'hype-start')}
            >
              {phase === 'reveal' ? <RotateCcw className="w-6 h-6" /> : <Coins className="w-6 h-6" />}
              {phase === 'reveal' ? 'もう1回' : '1回 まわす'}（{cost}）
            </Button>
            {!enough && <p className="text-center text-sm text-gray-300">あと {cost - progress.coins} コイン。あそぶと たまるよ！</p>}
          </div>
        </div>
      </Panel>
    </motion.div>
  );
};
