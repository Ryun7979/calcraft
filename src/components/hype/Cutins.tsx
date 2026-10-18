import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PixelChar } from './PixelChar';
import { RULES } from '../../lib/hype/rules';

// カットインと帯。どれも pointer-events: none（入力をさまたげない）。
// 画面の主要部分を隠す大きなカットイン（tier / fever）のあいだは、呼ぶ側で進行（FEVER ゲージの減り）を止める。

export type CutinSpec = { kind: 'tier'; tier: number } | { kind: 'fever' } | { kind: 'timeup' };
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
            <span className={`${toneClass[band.tone]} text-2xl md:text-3xl`}>{band.text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const TierCutin: React.FC<{ tier: number }> = ({ tier }) => (
  <motion.div
    className="absolute inset-0 flex items-center justify-center"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
  >
    <motion.div
      className="absolute left-0 right-0 h-[46%] bg-black/80 border-y-8 border-yellow-400"
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1 }}
      transition={{ duration: 0.15 }}
    />
    <motion.div
      className="absolute left-[2%] w-[26%] h-[52%]"
      initial={{ x: '-150%', rotate: -20 }}
      animate={{ x: '0%', rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 16 }}
    >
      <PixelChar who="boy" className="w-full h-full" initial="shout" />
    </motion.div>
    <motion.div
      className="absolute right-[2%] w-[26%] h-[52%]"
      initial={{ x: '150%', rotate: 20 }}
      animate={{ x: '0%', rotate: 0 }}
      transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 16 }}
    >
      <PixelChar who="girl" className="w-full h-full" initial="shout" />
    </motion.div>
    <motion.div
      className="relative flex flex-col items-center gap-2"
      initial={{ scale: 3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 14 }}
    >
      <span className="hype-shout text-4xl md:text-6xl">{RULES.combo.names[tier]}</span>
      <span className="hype-shout hype-shout-green text-3xl md:text-4xl">コンボ ×{RULES.combo.mult[tier]}</span>
    </motion.div>
  </motion.div>
);

const FEVER_LETTERS = ['F', 'E', 'V', 'E', 'R', '!', '!'];

const FeverCutin: React.FC = () => {
  // 0〜0.8秒：暗転＋虹の放射線（FxCanvas.converge）→ 0.8〜1.6秒：帯が開きキャラが左右から → 1.6〜2.4秒：文字を叩きつけ
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <motion.div
        className="absolute left-0 right-0 h-[56%] bg-gradient-to-r from-fuchsia-700 via-red-600 to-amber-500 border-y-8 border-black"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: 0.8, duration: 0.2 }}
      />
      <motion.div
        className="absolute left-0 w-[30%] h-[56%]"
        initial={{ x: '-120%' }}
        animate={{ x: '10%' }}
        transition={{ delay: 0.95, type: 'spring', stiffness: 220, damping: 14 }}
      >
        <PixelChar who="boy" className="w-full h-full" initial="feverDance" />
      </motion.div>
      <motion.div
        className="absolute right-0 w-[30%] h-[56%]"
        initial={{ x: '120%' }}
        animate={{ x: '-10%' }}
        transition={{ delay: 1.05, type: 'spring', stiffness: 220, damping: 14 }}
      >
        <PixelChar who="girl" className="w-full h-full" initial="feverDance" />
      </motion.div>
      <div className="relative flex">
        {FEVER_LETTERS.map((ch, i) => (
          <motion.span
            key={i}
            className="hype-shout text-6xl md:text-8xl"
            initial={{ scale: 4, opacity: 0, y: -60 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 1.6 + i * 0.08, type: 'spring', stiffness: 500, damping: 18 }}
          >
            {ch}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
};

const TIMEUP_LETTERS = ['T', 'I', 'M', 'E', ' ', 'U', 'P', '!', '!'];

const TimeUpCutin: React.FC = () => (
  <motion.div className="absolute inset-0 flex items-center justify-center" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
    <motion.div
      className="absolute inset-0 bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    />
    <div className="relative flex">
      {TIMEUP_LETTERS.map((ch, i) => (
        <motion.span
          key={i}
          className="hype-shout hype-shout-red text-6xl md:text-8xl"
          initial={{ scale: 4, opacity: 0, rotate: i % 2 ? 20 : -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ delay: i * 0.05, type: 'spring', stiffness: 500, damping: 16 }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </div>
  </motion.div>
);

export const CutinLayer: React.FC<{ cutin: Cutin | null }> = ({ cutin }) => (
  <div className="absolute inset-0 z-[80] pointer-events-none overflow-hidden">
    <AnimatePresence>
      {cutin?.kind === 'tier' && <TierCutin key={cutin.id} tier={cutin.tier} />}
      {cutin?.kind === 'fever' && <FeverCutin key={cutin.id} />}
      {cutin?.kind === 'timeup' && <TimeUpCutin key={cutin.id} />}
    </AnimatePresence>
  </div>
);

export type CountPhase = 'yoi' | 3 | 2 | 1 | 'go' | null;

const COUNT_STYLE: Record<string, { text: string; cls: string; rot: number }> = {
  yoi: { text: 'よーい…', cls: 'hype-shout text-5xl md:text-7xl', rot: 0 },
  '3': { text: '3', cls: 'hype-shout hype-shout-green text-8xl md:text-[10rem]', rot: -6 },
  '2': { text: '2', cls: 'hype-shout text-8xl md:text-[11rem]', rot: 6 },
  '1': { text: '1', cls: 'hype-shout hype-shout-red text-8xl md:text-[12rem]', rot: -10 },
  go: { text: 'GO!!', cls: 'hype-shout text-8xl md:text-[12rem]', rot: 0 },
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
