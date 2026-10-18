import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PixelChar, PixelCharHandle } from './PixelChar';
import { RULES } from '../../lib/hype/rules';

// カットインと帯。どれも pointer-events: none（入力をさまたげない）。
// 画面の主要部分を隠す大きなカットイン（tier / fever / feverStage / combo）のあいだは、呼ぶ側で進行（FEVER ゲージの減り）を止める。
// ミニカットイン（正解ごと）は画面のはしに出るだけなので進行は止めない。React を通さず DOM を直接動かす。

export type CutinSpec =
  | { kind: 'tier'; tier: number }
  | { kind: 'fever' }
  | { kind: 'feverStage'; stage: number }
  | { kind: 'combo'; combo: number }
  | { kind: 'timeup' };
export type Cutin = CutinSpec & { id: number };

export interface Band {
  id: number;
  text: string;
  tone: 'gold' | 'red' | 'green' | 'rainbow';
}

const toneClass: Record<Band['tone'], string> = {
  gold: 'hype-shout',
  red: 'hype-shout hype-shout-red',
  green: 'hype-shout hype-shout-green',
  rainbow: 'hype-shout',
};

/** 上部の帯（隠さないので進行は止めない） */
export const BandLayer: React.FC<{ band: Band | null }> = ({ band }) => (
  <div className="absolute left-0 right-0 top-[18%] z-[70] pointer-events-none overflow-hidden">
    <AnimatePresence>
      {band && (
        <motion.div
          key={band.id}
          initial={{ x: '100%' }}
          animate={{ x: '0%' }}
          exit={{ x: '-100%' }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="hype-tape py-2"
        >
          <div className="hype-tape-inner py-2 text-center">
            <span className={`${toneClass[band.tone]} text-3xl md:text-5xl`}>{band.text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

/** 画面いっぱいに回る放射光線（外側で出し入れ、内側で回す） */
const Rays: React.FC<{ rainbow?: boolean; speed?: string; delay?: number; opacity?: number; colors?: [string, string] }> = ({
  rainbow,
  speed = '6s',
  delay = 0,
  opacity = 0.8,
  colors,
}) => (
  <motion.div
    className="absolute left-1/2 top-1/2 w-[260vmax] h-[260vmax] -ml-[130vmax] -mt-[130vmax]"
    initial={{ opacity: 0, scale: 0.2 }}
    animate={{ opacity, scale: 1 }}
    transition={{ delay, duration: 0.35, ease: 'easeOut' }}
  >
    <div
      className={`w-full h-full ${rainbow ? 'hype-rays-rainbow' : 'hype-rays'}`}
      style={{
        ['--ray-speed' as string]: speed,
        ...(colors ? { ['--ray-a' as string]: colors[0], ['--ray-b' as string]: colors[1] } : {}),
      }}
    />
  </motion.div>
);

/** 左右から飛び込む大きなキャラ */
const BigChars: React.FC<{ motionName: 'shout' | 'feverDance'; delay?: number; size?: string }> = ({
  motionName,
  delay = 0,
  size = 'w-[34%] h-[80%]',
}) => (
  <>
    <motion.div
      className={`absolute left-0 bottom-[6%] ${size}`}
      initial={{ x: '-150%', rotate: -25, scale: 0.6 }}
      animate={{ x: '0%', rotate: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 14 }}
    >
      <PixelChar who="boy" className="w-full h-full hype-glow" initial={motionName} />
    </motion.div>
    <motion.div
      className={`absolute right-0 bottom-[6%] ${size}`}
      initial={{ x: '150%', rotate: 25, scale: 0.6 }}
      animate={{ x: '0%', rotate: 0, scale: 1 }}
      transition={{ delay: delay + 0.08, type: 'spring', stiffness: 260, damping: 14 }}
    >
      <PixelChar who="girl" className="w-full h-full hype-glow" initial={motionName} />
    </motion.div>
  </>
);

/** 文字を1つずつ叩きつける */
const SlamLetters: React.FC<{ text: string; cls: string; delay?: number; step?: number }> = ({ text, cls, delay = 0, step = 0.07 }) => (
  <div className="relative flex">
    {[...text].map((ch, i) => (
      <motion.span
        key={i}
        className={cls}
        initial={{ scale: 5, opacity: 0, y: -80, rotate: i % 2 ? 25 : -25 }}
        animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
        transition={{ delay: delay + i * step, type: 'spring', stiffness: 520, damping: 16 }}
      >
        {ch === ' ' ? ' ' : ch}
      </motion.span>
    ))}
  </div>
);

const TierCutin: React.FC<{ tier: number }> = ({ tier }) => {
  const top = tier >= RULES.combo.tiers.length - 1;
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.3 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div className="absolute inset-0 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.1 }} />
      <Rays rainbow={top} speed={top ? '3s' : '5s'} />
      <motion.div
        className="absolute left-[-5%] right-[-5%] h-[48%] hype-slash bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.18 }}
      />
      <BigChars motionName="shout" />
      <motion.div
        className="relative flex flex-col items-center gap-3"
        initial={{ scale: 4, opacity: 0, rotate: -12 }}
        animate={{ scale: 1, opacity: 1, rotate: -4 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 320, damping: 12 }}
      >
        <span className={`hype-quake hype-shout ${top ? 'hype-shout-rainbow' : 'hype-shout-red'} text-6xl md:text-[8rem] leading-none`}>
          {RULES.combo.names[tier]}
        </span>
        <span className="hype-shout hype-shout-green text-4xl md:text-7xl">コンボ ×{RULES.combo.mult[tier]}</span>
      </motion.div>
    </motion.div>
  );
};

/** 3コンボごと：大きな数字がドーン */
const ComboCutin: React.FC<{ combo: number }> = ({ combo }) => {
  const who = Math.floor(combo / RULES.combo.bandEvery) % 2 ? 'girl' : 'boy';
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center" exit={{ opacity: 0, x: '-30%' }} transition={{ duration: 0.18 }}>
      <motion.div className="absolute inset-0 bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.1 }} />
      <Rays speed="4s" opacity={0.6} colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']} />
      <motion.div
        className="absolute left-[-5%] right-[-5%] h-[40%] hype-slash bg-gradient-to-r from-sky-600 via-cyan-400 to-sky-600"
        initial={{ x: '100%' }}
        animate={{ x: '0%' }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
      />
      <motion.div
        className={`absolute bottom-[4%] w-[30%] h-[70%] ${who === 'boy' ? 'left-[2%]' : 'right-[2%]'}`}
        initial={{ y: '120%' }}
        animate={{ y: '0%' }}
        transition={{ delay: 0.05, type: 'spring', stiffness: 300, damping: 13 }}
      >
        <PixelChar who={who} className="w-full h-full hype-glow" initial="feverDance" />
      </motion.div>
      <motion.div
        className="relative flex items-baseline gap-4"
        initial={{ scale: 6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: -6 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 480, damping: 13 }}
      >
        <span className="hype-quake hype-shout text-[8rem] md:text-[13rem] leading-none">{combo}</span>
        <span className="hype-shout hype-shout-red text-5xl md:text-7xl">COMBO!!</span>
      </motion.div>
    </motion.div>
  );
};

const FeverCutin: React.FC = () => {
  // 0〜0.8秒：暗転＋虹の放射線（FxCanvas.converge）→ 0.8〜1.6秒：帯が開き光線が回りキャラが左右から → 1.6〜2.6秒：文字を叩きつけ
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center" exit={{ opacity: 0, scale: 1.4 }} transition={{ duration: 0.22 }}>
      <Rays rainbow speed="2.5s" delay={0.8} opacity={0.75} />
      <motion.div
        className="absolute left-[-5%] right-[-5%] h-[60%] hype-slash bg-gradient-to-r from-fuchsia-700 via-red-600 to-amber-500"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: 0.8, duration: 0.2 }}
      />
      <BigChars motionName="feverDance" delay={0.95} size="w-[36%] h-[90%]" />
      <div className="relative flex flex-col items-center">
        <SlamLetters text="FEVER!!" cls="hype-shout hype-shout-rainbow text-7xl md:text-[11rem] leading-none" delay={1.6} step={0.08} />
        <motion.span
          className="hype-quake hype-shout text-4xl md:text-6xl mt-4"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 2.15, type: 'spring', stiffness: 500, damping: 14 }}
        >
          スコア ×{RULES.fever.mult[0]}!!
        </motion.span>
      </div>
    </motion.div>
  );
};

/** FEVER の段階アップ（×4・×8・×16） */
const FeverStageCutin: React.FC<{ stage: number }> = ({ stage }) => (
  <motion.div className="absolute inset-0 flex items-center justify-center" exit={{ opacity: 0, scale: 1.4 }} transition={{ duration: 0.2 }}>
    <motion.div className="absolute inset-0 bg-black/65" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.1 }} />
    <Rays rainbow speed={`${Math.max(1, 3 - stage * 0.6)}s`} opacity={0.7} />
    <motion.div
      className="absolute left-[-5%] right-[-5%] h-[52%] hype-slash bg-gradient-to-r from-red-700 via-orange-500 to-red-700"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.16 }}
    />
    <BigChars motionName="feverDance" size="w-[34%] h-[85%]" />
    <div className="relative flex flex-col items-center">
      <SlamLetters text={`×${RULES.fever.mult[stage]}`} cls="hype-quake hype-shout hype-shout-rainbow text-[8rem] md:text-[14rem] leading-none" step={0.1} />
      <motion.span
        className="hype-shout text-4xl md:text-6xl mt-2"
        initial={{ scale: 3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 420, damping: 14 }}
      >
        止まらない！！
      </motion.span>
    </div>
  </motion.div>
);

const TimeUpCutin: React.FC = () => (
  <motion.div className="absolute inset-0 flex items-center justify-center" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
    <motion.div className="absolute inset-0 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} />
    <Rays speed="8s" opacity={0.5} colors={['rgba(255,90,90,0.5)', 'rgba(255,90,90,0)']} />
    <SlamLetters text="TIME UP!!" cls="hype-shout hype-shout-red text-6xl md:text-[9rem]" step={0.05} />
  </motion.div>
);

export const CutinLayer: React.FC<{ cutin: Cutin | null }> = ({ cutin }) => (
  <div className="absolute inset-0 z-[80] pointer-events-none overflow-hidden">
    <AnimatePresence>
      {cutin?.kind === 'tier' && <TierCutin key={cutin.id} tier={cutin.tier} />}
      {cutin?.kind === 'combo' && <ComboCutin key={cutin.id} combo={cutin.combo} />}
      {cutin?.kind === 'fever' && <FeverCutin key={cutin.id} />}
      {cutin?.kind === 'feverStage' && <FeverStageCutin key={cutin.id} stage={cutin.stage} />}
      {cutin?.kind === 'timeup' && <TimeUpCutin key={cutin.id} />}
    </AnimatePresence>
  </div>
);

// --- ミニカットイン（正解ごと） ---

export interface MiniCutinHandle {
  /** who のがわ（ブロッくん＝左、ブロッちゃん＝右）から、顔アップとことばがななめに入る */
  show(who: 'boy' | 'girl', text: string, sub: string, tone?: 'gold' | 'green' | 'rainbow'): void;
}

interface MiniSlot {
  box: React.RefObject<HTMLDivElement | null>;
  text: React.RefObject<HTMLSpanElement | null>;
  sub: React.RefObject<HTMLSpanElement | null>;
  char: React.RefObject<PixelCharHandle | null>;
  anim: Animation | null;
}

export const MiniCutinLayer = forwardRef<MiniCutinHandle, { ms: number }>(function MiniCutinLayer({ ms }, ref) {
  const slot = (): MiniSlot => ({
    box: React.createRef<HTMLDivElement>(),
    text: React.createRef<HTMLSpanElement>(),
    sub: React.createRef<HTMLSpanElement>(),
    char: React.createRef<PixelCharHandle>(),
    anim: null,
  });
  const slots = useRef({ boy: slot(), girl: slot() });

  useImperativeHandle(ref, () => ({
    show(who, text, sub, tone = 'gold') {
      const s = slots.current[who];
      const box = s.box.current;
      if (!box || !s.text.current || !s.sub.current) return;
      s.text.current.textContent = text;
      s.sub.current.textContent = sub;
      box.dataset.tone = tone;
      s.char.current?.play('cheer');
      const out = who === 'boy' ? '-120%' : '120%';
      s.anim?.cancel();
      s.anim = box.animate(
        [
          { transform: `translateX(${out})`, opacity: 1 },
          { transform: 'translateX(0)', opacity: 1, offset: 0.14 },
          { transform: `translateX(${who === 'boy' ? '2%' : '-2%'})`, opacity: 1, offset: 0.8 },
          { transform: `translateX(${out})`, opacity: 1 },
        ],
        { duration: ms, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' },
      );
    },
  }), [ms]);

  const render = (who: 'boy' | 'girl') => {
    const s = slots.current[who];
    const left = who === 'boy';
    return (
      <div
        ref={s.box}
        className={`absolute top-[26%] h-[19%] w-[min(34vw,560px)] ${left ? 'left-0' : 'right-0'}`}
        style={{ transform: `translateX(${left ? '-120%' : '120%'})` }}
      >
        <div className={`hype-mini absolute inset-0 ${left ? '-left-10' : '-right-10'}`} data-tone="gold" />
        <div className={`relative h-full flex items-center gap-3 ${left ? 'flex-row pl-4' : 'flex-row-reverse pr-4'}`}>
          {/* 顔アップ（上半分だけ見せる） */}
          <div className="h-full aspect-square overflow-hidden shrink-0">
            <PixelChar ref={s.char} who={who} className="w-full h-[190%] hype-glow" initial="shout" />
          </div>
          <div className={`flex flex-col min-w-0 ${left ? 'items-start' : 'items-end'}`}>
            <span ref={s.text} className="hype-shout text-3xl md:text-5xl whitespace-nowrap" />
            <span ref={s.sub} className="hype-shout hype-shout-green text-xl md:text-3xl whitespace-nowrap mt-2" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-[72] pointer-events-none overflow-hidden" aria-hidden>
      {render('boy')}
      {render('girl')}
    </div>
  );
});

export type CountPhase = 'yoi' | 3 | 2 | 1 | 'go' | null;

const COUNT_STYLE: Record<string, { text: string; cls: string; rot: number }> = {
  yoi: { text: 'よーい…', cls: 'hype-shout text-6xl md:text-8xl', rot: 0 },
  '3': { text: '3', cls: 'hype-shout hype-shout-green text-9xl md:text-[13rem]', rot: -6 },
  '2': { text: '2', cls: 'hype-shout text-9xl md:text-[14rem]', rot: 6 },
  '1': { text: '1', cls: 'hype-shout hype-shout-red text-9xl md:text-[15rem]', rot: -10 },
  go: { text: 'GO!!', cls: 'hype-shout hype-shout-rainbow text-9xl md:text-[15rem]', rot: 0 },
};

export const CountdownLayer: React.FC<{ phase: CountPhase }> = ({ phase }) => (
  <div className="absolute inset-0 z-[85] pointer-events-none flex items-center justify-center">
    <AnimatePresence>
      {phase !== null && (
        <motion.div
          key={String(phase)}
          initial={{ scale: 2.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: phase === 'go' ? 3 : 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        >
          {/* アニメは外側、傾きは内側（傾きがアニメで消えないように） */}
          <div style={{ transform: `rotate(${COUNT_STYLE[String(phase)].rot}deg)` }}>
            <span className={COUNT_STYLE[String(phase)].cls}>{COUNT_STYLE[String(phase)].text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
