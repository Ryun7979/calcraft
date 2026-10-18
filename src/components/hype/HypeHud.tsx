import { forwardRef, useImperativeHandle, useRef } from 'react';
import { bonusMult, comboMult, comboTier, HypeState } from '../../lib/hype/engine';
import { Mods } from '../../lib/hype/skills';
import { RULES } from '../../lib/hype/rules';
import { OP_NAMES } from '../../constants';
import { Grade, Operation } from '../../types';

export interface HudExtra {
  /** チャレンジののこり秒数（れんしゅうでは undefined） */
  timeLeft?: number;
  defeated: number;
  mods: Mods;
}

export interface HypeHudHandle {
  /** 毎フレーム呼ぶ。点数は少しずつ数え上げる */
  update(s: HypeState, dt: number, extra: HudExtra): void;
  /** ゲージが減ったとき赤く光らせる */
  hurt(): void;
  gaugeRect(): DOMRect | null;
  scoreRect(): DOMRect | null;
}

interface Props {
  index: number;
  total: number;
  grade: Grade;
  op: Operation;
  challenge: boolean;
}

const fmtTime = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const HypeHud = forwardRef<HypeHudHandle, Props>(function HypeHud({ index, total, grade, op, challenge }, ref) {
  const scoreRef = useRef<HTMLSpanElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const comboNumRef = useRef<HTMLSpanElement>(null);
  const comboNameRef = useRef<HTMLSpanElement>(null);
  const multRef = useRef<HTMLSpanElement>(null);
  const gaugeRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const feverRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const timeBoxRef = useRef<HTMLDivElement>(null);
  const correctRef = useRef<HTMLSpanElement>(null);
  const zombieRef = useRef<HTMLSpanElement>(null);
  const bonusRef = useRef<HTMLDivElement>(null);
  const bonusTextRef = useRef<HTMLSpanElement>(null);
  const shown = useRef({ score: 0, combo: -1, fever: -1, time: '', urgent: false, correct: -1, defeated: -1, bonus: '' });

  useImperativeHandle(ref, () => ({
    update(s, dt, extra) {
      const sh = shown.current;
      if (sh.score !== s.score) {
        const diff = s.score - sh.score;
        const step = Math.max(1, Math.ceil(Math.abs(diff) * Math.min(1, dt * 8)));
        const jumped = diff > 0 && sh.score === s.score - diff;
        sh.score = diff > 0 ? Math.min(s.score, sh.score + step) : s.score;
        if (scoreRef.current) {
          scoreRef.current.textContent = sh.score.toLocaleString();
          // 点数が入りはじめたら、ドンとふくらむ
          if (jumped) scoreRef.current.animate([{ transform: 'scale(1.35)', color: '#7dff6a' }, { transform: 'scale(1)' }], { duration: 400, easing: 'ease-out' });
        }
      }
      if (sh.combo !== s.combo) {
        sh.combo = s.combo;
        const tier = comboTier(s.combo);
        if (comboNumRef.current) comboNumRef.current.textContent = String(s.combo);
        if (comboNameRef.current) comboNameRef.current.textContent = RULES.combo.names[tier] || 'コンボ';
        if (comboRef.current) {
          comboRef.current.style.opacity = s.combo > 0 ? '1' : '0.45';
          if (s.combo > 0)
            comboRef.current.animate([{ transform: 'scale(2) rotate(-8deg)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
        }
      }
      const fs = s.fever ? s.feverStage : -1;
      const bm = bonusMult(s, extra.mods);
      const totalMult = comboMult(s.combo) * (s.fever ? RULES.fever.mult[s.feverStage] : 1) * bm;
      // ボーナスタイム（ゴールデン問題の正解で始まる）
      const bonusText = s.bonusSec > 0 ? `${bm > RULES.golden.bonusMult ? 'W ' : ''}BONUS ×${bm}  のこり ${Math.ceil(s.bonusSec)}` : '';
      if (bonusText !== sh.bonus) {
        const started = !sh.bonus && bonusText;
        sh.bonus = bonusText;
        if (bonusRef.current) bonusRef.current.style.visibility = bonusText ? 'visible' : 'hidden';
        if (bonusTextRef.current) bonusTextRef.current.textContent = bonusText;
        if (started) bonusRef.current?.animate([{ transform: 'scale(1.8)' }, { transform: 'scale(1)' }], { duration: 350, easing: 'ease-out' });
      }
      if (multRef.current) multRef.current.textContent = `×${Number.isInteger(totalMult) ? totalMult : totalMult.toFixed(1)}`;
      if (sh.fever !== fs) {
        sh.fever = fs;
        if (feverRef.current) {
          feverRef.current.textContent = fs >= 0 ? `FEVER ×${RULES.fever.mult[fs]}` : 'FEVER';
          feverRef.current.style.color = fs >= 0 ? '#ff5a5a' : '#ffe14d';
        }
        if (fillRef.current) fillRef.current.dataset.fever = fs >= 0 ? '1' : '0';
      }
      if (fillRef.current) fillRef.current.style.width = `${(s.gauge / RULES.gauge.max) * 100}%`;

      if (extra.timeLeft !== undefined) {
        const t = fmtTime(extra.timeLeft);
        if (t !== sh.time && timeRef.current) {
          sh.time = t;
          timeRef.current.textContent = t;
          const urgent = extra.timeLeft <= RULES.challenge.warnSec;
          if (urgent && timeBoxRef.current) {
            timeBoxRef.current.animate([{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
          }
          if (urgent !== sh.urgent) {
            sh.urgent = urgent;
            timeRef.current.style.color = urgent ? '#ff5a5a' : '#ffffff';
          }
        }
        if (sh.correct !== s.correct && correctRef.current) {
          sh.correct = s.correct;
          correctRef.current.textContent = String(s.correct);
        }
      }
      if (sh.defeated !== extra.defeated && zombieRef.current) {
        sh.defeated = extra.defeated;
        zombieRef.current.textContent = String(extra.defeated);
        zombieRef.current.animate([{ transform: 'scale(1.8)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
      }
    },
    hurt() {
      gaugeRef.current?.animate(
        [{ boxShadow: '0 0 0 6px #ff3030' }, { boxShadow: '0 0 0 0 #ff3030' }],
        { duration: 500, easing: 'ease-out' },
      );
    },
    gaugeRect: () => gaugeRef.current?.getBoundingClientRect() ?? null,
    scoreRect: () => scoreRef.current?.getBoundingClientRect() ?? null,
  }), []);

  return (
    <div className="w-full grid grid-cols-3 items-start gap-4 px-4 pointer-events-none select-none">
      <div className="flex flex-col gap-1 items-start">
        {challenge ? (
          <div ref={timeBoxRef} className="mc-panel !py-1 !px-4 flex items-baseline gap-3 origin-left">
            <span className="text-base font-bold text-yellow-200 whitespace-nowrap">残り</span>
            <span ref={timeRef} className="mc-title text-3xl text-white">0:00</span>
          </div>
        ) : (
          <div className="mc-panel !py-1 !px-4">
            <span className="text-lg font-bold text-white whitespace-nowrap">第 {index + 1} 問 / {total}</span>
          </div>
        )}
        <div className="mc-panel !py-1 !px-4 flex items-center gap-3 whitespace-nowrap">
          <span className="text-base font-bold text-blue-300">Lv {grade} {OP_NAMES[op]}</span>
          {challenge && (
            <span className="text-base font-bold text-white">
              正解 <span ref={correctRef} className="text-yellow-300 text-xl">0</span>
            </span>
          )}
        </div>
        <div className="mc-panel !py-1 !px-4 whitespace-nowrap">
          <span className="text-base font-bold text-green-300">
            ゾンビ <span ref={zombieRef} className="inline-block text-xl text-white">0</span> 体 やっつけた
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <span className="text-xs text-yellow-200 tracking-widest">SCORE</span>
        <span ref={scoreRef} className="inline-block mc-title hype-hud-score text-white drop-shadow-[0_6px_0_rgba(0,0,0,0.6)]">0</span>
        <div ref={comboRef} className="flex items-baseline gap-2 mt-1" style={{ opacity: 0.45 }}>
          <span ref={comboNumRef} className="mc-title hype-hud-combo text-yellow-300 drop-shadow-[0_5px_0_rgba(0,0,0,0.6)]">0</span>
          <span ref={comboNameRef} className="text-2xl md:text-3xl font-bold text-yellow-200 whitespace-nowrap">コンボ</span>
          <span ref={multRef} className="hype-sticker text-xl md:text-2xl px-3 py-0.5">×1</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span ref={feverRef} className="mc-title text-xl md:text-2xl" style={{ color: '#ffe14d' }}>FEVER</span>
        <div ref={gaugeRef} className="hype-gauge w-full max-w-[380px] h-10 relative overflow-hidden">
          <div ref={fillRef} className="hype-gauge-fill h-full" style={{ width: '0%' }} data-fever="0" />
        </div>
        <div ref={bonusRef} className="hype-golden-tag px-3 py-0.5 origin-right" style={{ visibility: 'hidden' }}>
          <span ref={bonusTextRef} className="text-lg md:text-xl whitespace-nowrap" />
        </div>
      </div>
    </div>
  );
});
