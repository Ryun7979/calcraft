import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChallengeMinutes, EffectIntensity, Grade, Operation, PlayMode, Question } from '../../types';
import { OP_SYMBOLS, pageTransition } from '../../constants';
import { Button } from '../ui/Button';
import { FxHandle } from './FxCanvas';
import { BattleField, BattleHandle } from './BattleField';
import { HypeHud, HypeHudHandle } from './HypeHud';
import { HypeAnswerInput } from './HypeAnswerInput';
import { Band, BandLayer, CountdownLayer, CountPhase, Cutin, CutinLayer, CutinSpec } from './Cutins';
import {
  challengeParAnswers,
  comboTier,
  HypeEvent,
  HypeState,
  hypeAnswer,
  hypeKey,
  hypeTick,
  initialHype,
  perfectScore,
} from '../../lib/hype/engine';
import { INTENSITY, RULES } from '../../lib/hype/rules';
import { hypeAudio } from '../../lib/hype/audio';
import { pickPraise } from '../../lib/hype/praise';

export interface HypeSummary {
  state: HypeState;
  /** ランク計算用の満点（れんしゅう：全問正解の点数／チャレンジ：目安のペースで全問正解した点数） */
  perfect: number;
  defeated: number;
  mode: PlayMode;
  minutes: ChallengeMinutes;
}

interface Props {
  currentIndex: number;
  selectedGrade: Grade;
  selectedOp: Operation;
  questions: Question[];
  feedback: 'correct' | 'incorrect' | null;
  showHint: boolean;
  hintText: string;
  levelChange: 'up' | 'down' | null;
  handleHint: () => void;
  handleAnswer: (val: string, remVal: string, skipped?: boolean) => void;
  endGame: () => void;
  playMode: PlayMode;
  challengeMinutes: ChallengeMinutes;
  intensity: EffectIntensity;
  fx: React.RefObject<FxHandle | null>;
  summaryRef: React.MutableRefObject<HypeSummary | null>;
  /** 大きなカットイン中は true を返す関数を入れる（useGame が次の問題へ進むのを待つ） */
  holdRef: React.MutableRefObject<(() => boolean) | null>;
}

const center = (el: Element | null | undefined) => {
  const r = el?.getBoundingClientRect();
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export const HypePlayingScreen: React.FC<Props> = (props) => {
  const { currentIndex, selectedGrade, selectedOp, questions, feedback, showHint, hintText, levelChange, intensity, fx, summaryRef, holdRef } = props;
  const challenge = props.playMode === 'challenge';
  const prof = INTENSITY[intensity];
  const currentQ = questions[currentIndex];
  const hasRemainder = currentQ.op === 'div' && currentQ.remainder !== undefined;

  const stageRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HypeHudHandle>(null);
  const battleRef = useRef<BattleHandle>(null);

  const hype = useRef<HypeState>(initialHype());
  /** 止められるタイマー：理由が1つでもあれば FEVER ゲージの減り・チャレンジの時計が止まる */
  const pauses = useRef(new Set<string>());
  const timers = useRef<number[]>([]);
  const keyIndex = useRef(0);
  const passing = useRef(false);
  const idSeq = useRef(0);
  const defeated = useRef(0);
  const timeLeft = useRef(props.challengeMinutes * 60);
  const timeUpRef = useRef(false);

  const [phase, setPhase] = useState<CountPhase>('yoi');
  const [timeUp, setTimeUp] = useState(false);
  const [cutin, setCutin] = useState<Cutin | null>(null);
  const [band, setBand] = useState<Band | null>(null);
  const [tier, setTier] = useState(0);
  const [feverOn, setFeverOn] = useState(false);
  const active = (phase === 'go' || phase === null) && !timeUp;
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    holdRef.current = () => pauses.current.has('cutin');
    return () => {
      holdRef.current = null;
    };
  }, [holdRef]);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // --- 演出の部品 ---
  const shake = (amp: number, ms = 320) => {
    const a = amp * prof.shake;
    if (a <= 0 || !stageRef.current) return;
    stageRef.current.animate(
      [0, 1, 2, 3, 4, 5, 6].map((i) => ({ transform: i === 6 ? 'none' : `translate(${rand(-a, a)}px, ${rand(-a, a)}px) rotate(${rand(-a, a) * 0.08}deg)` })),
      { duration: ms },
    );
  };
  const zoomPulse = () => {
    if (prof.shake <= 0 || !stageRef.current) return;
    stageRef.current.animate([{ scale: '1' }, { scale: '1.05' }, { scale: '1' }], { duration: 280, easing: 'ease-out', composite: 'add' });
  };
  const invertPulse = () => {
    if (!prof.invert || !stageRef.current) return;
    stageRef.current.animate([{ filter: 'invert(1) hue-rotate(180deg)' }, { filter: 'none' }], { duration: 160 });
  };
  const fireworks = (n: number, spreadMs = 120) => {
    for (let i = 0; i < n; i++) {
      later(i * spreadMs, () => {
        fx.current?.firework(rand(0.1, 0.9) * window.innerWidth, rand(0.1, 0.55) * window.innerHeight, Math.random() < 0.5 ? undefined : rand(0, 360));
        if (i % 3 === 0) hypeAudio.firework();
      });
    }
  };
  const showBand = (text: string, tone: Band['tone']) => {
    const id = ++idSeq.current;
    setBand({ id, text, tone });
    later(RULES.timing.bandMs, () => setBand((b) => (b?.id === id ? null : b)));
  };
  const showCutin = (c: CutinSpec, ms: number) => {
    const id = ++idSeq.current;
    setCutin({ ...c, id });
    pauses.current.add('cutin');
    later(ms, () => {
      setCutin((cur) => (cur?.id === id ? null : cur));
      pauses.current.delete('cutin');
    });
  };
  const moodFor = (t: number, fever: boolean) => (fever ? 'feverDance' : t >= 2 ? 'shout' : 'idle');
  const hordeFor = (t: number, s: HypeState) => (s.fever ? 3 + s.feverStage : t >= 2 ? 2 : 1);

  const handleEvents = (events: HypeEvent[]) => {
    const hasFever = events.some((e) => e.kind === 'feverStart');
    for (const ev of events) {
      switch (ev.kind) {
        case 'tierUp': {
          setTier(ev.tier);
          hypeAudio.tierUp(ev.tier);
          fx.current?.setSpeedLines(ev.tier >= 2 ? (ev.tier - 1) / 3 : 0);
          fx.current?.flash('#ffe14d', 0.3, 180);
          battleRef.current?.setMood(moodFor(ev.tier, hype.current.fever));
          battleRef.current?.setHorde(hordeFor(ev.tier, hype.current));
          if (prof.bigCutin && !hasFever && !pauses.current.has('cutin')) showCutin({ kind: 'tier', tier: ev.tier }, RULES.timing.tierCutinMs);
          else showBand(`${RULES.combo.names[ev.tier]} コンボ ×${RULES.combo.mult[ev.tier]}`, 'gold');
          break;
        }
        case 'comboBand':
          hypeAudio.comboBand();
          showBand(`${ev.combo} コンボ！！ すごすぎ！`, 'gold');
          fireworks(3, 80);
          break;
        case 'gaugeMax': {
          const g = hudRef.current?.gaugeRect();
          if (g) fx.current?.bang('MAX!!', g.right - 60, g.bottom + 40, '#ff5a5a', 30);
          break;
        }
        case 'feverStart': {
          hypeAudio.feverStart();
          fx.current?.setFever(0);
          setFeverOn(true);
          battleRef.current?.setMood('feverDance');
          battleRef.current?.setHorde(hordeFor(comboTier(hype.current.combo), hype.current));
          battleRef.current?.say(pickPraise('fever'), true, 'boy');
          later(300, () => battleRef.current?.say(pickPraise('fever'), true, 'girl'));
          if (prof.bigCutin) {
            fx.current?.converge(800);
            showCutin({ kind: 'fever' }, RULES.timing.feverEntryMs);
            later(1600, () => {
              hypeAudio.playBgm('fever');
              fireworks(14, 50);
              fx.current?.confetti(160);
              fx.current?.flash('#ffffff', 0.55, 220, true);
              fx.current?.ring(window.innerWidth / 2, window.innerHeight / 2, '#ffffff', Math.max(window.innerWidth, window.innerHeight) * 0.7);
              shake(16, 600);
            });
          } else {
            hypeAudio.playBgm('fever');
            showBand('FEVER!! スコア ×2', 'rainbow');
            fireworks(4);
          }
          break;
        }
        case 'feverStage': {
          hypeAudio.feverStage(ev.stage);
          fx.current?.setFever(ev.stage);
          battleRef.current?.setHorde(hordeFor(comboTier(hype.current.combo), hype.current));
          showBand(`FEVER ×${RULES.fever.mult[ev.stage]}!! とまらない！`, 'red');
          fireworks(4 + ev.stage * 3, 70);
          fx.current?.flash('#ffffff', 0.4, 180);
          fx.current?.ring(window.innerWidth / 2, window.innerHeight / 2, '#ff5a5a', window.innerWidth * 0.6);
          invertPulse();
          break;
        }
        case 'feverEnd':
          hypeAudio.feverEnd();
          hypeAudio.playBgm('play');
          fx.current?.setFever(-1);
          setFeverOn(false);
          battleRef.current?.setMood(moodFor(comboTier(hype.current.combo), false));
          battleRef.current?.setHorde(hordeFor(comboTier(hype.current.combo), hype.current));
          showBand('FEVER おしまい！ よくがんばった！', 'green');
          break;
      }
    }
  };
  const handleEventsRef = useRef(handleEvents);
  handleEventsRef.current = handleEvents;

  const writeSummary = () => {
    if (summaryRef.current) {
      summaryRef.current.state = hype.current;
      summaryRef.current.defeated = defeated.current;
    }
  };

  // --- 開始：カウントダウン（よーい → 3 → 2 → 1 → GO!!）。カウント中の入力は受け付けない ---
  useEffect(() => {
    const f = fx.current;
    f?.setIntensity(prof);
    f?.setFever(-1);
    f?.setSpeedLines(0);
    hypeAudio.playBgm(null);
    const perfect = challenge
      ? perfectScore(challengeParAnswers(questions, props.challengeMinutes * 60))
      : perfectScore(questions.map((q) => q.answer));
    summaryRef.current = { state: hype.current, perfect, defeated: 0, mode: props.playMode, minutes: props.challengeMinutes };

    const seq: CountPhase[] = ['yoi', 3, 2, 1, 'go'];
    let t = 0;
    seq.forEach((p, i) => {
      later(t, () => {
        setPhase(p);
        const b = battleRef.current;
        if (p === 'yoi') {
          hypeAudio.yoi();
          b?.setMood('charge');
          b?.say(pickPraise('start'), true, 'boy');
          later(350, () => b?.say(challenge ? `${props.challengeMinutes}ぷん チャレンジ！` : pickPraise('start'), true, 'girl'));
          if (levelChange === 'up') showBand('LEVEL UP!! レベルがあがった！ すごい！', 'green');
          if (levelChange === 'down') showBand('レベルをちょうせい！ じっくりいこう！', 'gold');
        } else if (p === 'go') {
          hypeAudio.go();
          hypeAudio.playBgm('play');
          b?.setMood('idle');
          b?.play('jump');
          fireworks(8, 50);
          fx.current?.confetti(90);
          fx.current?.flash('#ffffff', 0.4, 200);
          fx.current?.ring(window.innerWidth / 2, window.innerHeight / 2, '#ffe14d', window.innerWidth * 0.5);
          shake(12);
        } else {
          hypeAudio.countdown(p as number);
          b?.play('count');
          fireworks(4 - (p as number), 90);
          fx.current?.flash('#ffffff', 0.15, 100);
          fx.current?.ring(window.innerWidth / 2, window.innerHeight / 2, '#ffffff', 200 + (4 - (p as number)) * 80);
        }
      });
      t += RULES.timing.countdownMs[i];
    });
    later(t, () => setPhase(null));

    const ts = timers.current;
    return () => {
      ts.forEach(clearTimeout);
      timers.current = [];
      fx.current?.setFever(-1);
      fx.current?.setSpeedLines(0);
    };
    // 開始時に1回だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 時間切れ（チャレンジ） ---
  const triggerTimeUp = () => {
    if (timeUpRef.current) return;
    timeUpRef.current = true;
    setTimeUp(true);
    hypeAudio.timeUp();
    const id = ++idSeq.current;
    // 「次の問題へ進む」は止めない（答えの途中の反映を待つため）。時計とゲージは止める
    pauses.current.add('timeup');
    setCutin({ kind: 'timeup', id });
    battleRef.current?.play('jump');
    battleRef.current?.say('おつかれさま！！', true, 'boy');
    later(300, () => battleRef.current?.say('がんばったね！！', true, 'girl'));
    fireworks(10, 60);
    fx.current?.flash('#ffffff', 0.5, 220, true);
    writeSummary();
    later(2000, () => {
      writeSummary();
      props.endGame();
    });
  };
  const triggerTimeUpRef = useRef(triggerTimeUp);
  triggerTimeUpRef.current = triggerTimeUp;

  // --- 毎フレーム：時計・FEVER ゲージの減り・FEVER 中の花火・HUD ---
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let fw = 0;
    let lastSec = Math.ceil(timeLeft.current);
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const running = activeRef.current && pauses.current.size === 0;
      if (running) {
        const r = hypeTick(hype.current, dt);
        hype.current = r.state;
        if (r.events.length) handleEventsRef.current(r.events);
        if (challenge) {
          timeLeft.current = Math.max(0, timeLeft.current - dt);
          const sec = Math.ceil(timeLeft.current);
          if (sec !== lastSec) {
            lastSec = sec;
            if (sec <= RULES.challenge.warnSec && sec > 0) hypeAudio.clock(true);
            else if (sec % 10 === 0 && sec > 0) hypeAudio.clock(false);
          }
          if (timeLeft.current <= 0) triggerTimeUpRef.current();
        }
      }
      const s = hype.current;
      if (s.fever && pauses.current.size === 0) {
        fw -= dt;
        if (fw <= 0) {
          fw = 1.2 / Math.pow(2, s.feverStage);
          fx.current?.firework(rand(0.05, 0.95) * window.innerWidth, rand(0.05, 0.35) * window.innerHeight);
        }
      }
      hudRef.current?.update(s, dt, { timeLeft: challenge ? timeLeft.current : undefined, defeated: defeated.current });
      writeSummary();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx, summaryRef, challenge]);

  useEffect(() => {
    keyIndex.current = 0;
  }, [currentIndex]);

  // --- 1操作ごと：数字を打つ ---
  const onDigit = useCallback((ch: string, el: HTMLElement | null) => {
    const r = hypeKey(hype.current);
    hype.current = r.state;
    const c = center(el);
    const t = comboTier(r.state.combo);
    hypeAudio.key(r.state.combo + keyIndex.current++);
    fx.current?.burst(c.x, c.y, { count: 18 + t * 6, speed: 6 + t, size: 9 });
    fx.current?.ring(c.x, c.y, '#ffe14d', 90 + t * 20);
    fx.current?.flyText(ch, c.x, c.y, '#ffe14d', 64);
    fx.current?.flash('#ffffff', 0.05, 80);
    const g = hudRef.current?.gaugeRect();
    if (g && r.gaugeDelta > 0) {
      const gx = g.left + (g.width * hype.current.gauge) / RULES.gauge.max;
      fx.current?.popText(`+${Math.round(r.gaugeDelta)}`, Math.min(g.right - 20, gx), g.bottom + 18, '#ffe14d', 22);
    }
    battleRef.current?.say(pickPraise('key'));
    battleRef.current?.key();
    handleEventsRef.current(r.events);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onErase = useCallback((el: HTMLElement | null) => {
    const c = center(el);
    hypeAudio.erase();
    fx.current?.burst(c.x, c.y, { count: 8, colors: ['#bbbbbb', '#ffffff'], speed: 3, size: 7 });
    battleRef.current?.say(pickPraise('erase'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = useCallback((v: string, r: string) => props.handleAnswer(v, r, false), [props.handleAnswer]);

  const onHint = () => {
    if (feedback !== null || showHint || !active) return;
    hypeAudio.select();
    battleRef.current?.say(pickPraise('hint'), true);
    battleRef.current?.play('cheer');
    props.handleHint();
  };

  const onPass = () => {
    if (feedback !== null || !active) return;
    passing.current = true;
    hypeAudio.select();
    props.handleAnswer('', '', true);
  };

  // --- こたえた結果（判定は useGame のまま。ここでは演出だけ） ---
  useEffect(() => {
    if (!feedback) return;
    const ok = feedback === 'correct';
    const wasPass = passing.current;
    passing.current = false;
    const guarded = pauses.current.has('cutin');
    const r = hypeAnswer(hype.current, ok, currentQ.answer, guarded);
    hype.current = r.state;
    const c = center(questionRef.current);
    const t = comboTier(r.state.combo);
    const big = t >= 2 || r.state.fever;
    const b = battleRef.current;

    if (ok) {
      hypeAudio.correct(t + (r.state.fever ? 1 : 0));
      fx.current?.firework(c.x, c.y);
      fx.current?.ring(c.x, c.y, '#7dff6a', 260);
      fx.current?.burst(c.x, c.y, { count: 40 + t * 20, speed: 10 + t, size: 11 });
      if (big) {
        fx.current?.firework(c.x - window.innerWidth * 0.28, c.y - 40);
        fx.current?.firework(c.x + window.innerWidth * 0.28, c.y - 40);
      }
      fx.current?.flash('#ffffff', 0.25, 150);
      const sr = hudRef.current?.scoreRect();
      if (sr && r.gained > 0) fx.current?.popText(`+${r.gained.toLocaleString()}`, sr.left + sr.width / 2, sr.bottom + 30, '#7dff6a', 38);
      b?.say(pickPraise(big ? 'correctBig' : 'correct'), true);
      const power = r.state.fever ? Math.min(4, 2 + r.state.feverStage) : t >= 2 ? 2 : 1;
      b?.attack(power, t >= 3 || r.state.fever);
      shake(4 + t * 3);
      if (t >= 3) {
        zoomPulse();
        invertPulse();
      }
    } else if (wasPass) {
      hypeAudio.erase();
      b?.say(pickPraise('pass'), true);
      b?.play('cheer');
    } else {
      hypeAudio.miss();
      fx.current?.flash('#ff2020', 0.35, 260, true);
      b?.miss();
      b?.say(pickPraise('miss'), true);
      if (!guarded) hudRef.current?.hurt();
      shake(6);
    }
    if (!ok && !guarded) {
      setTier(0);
      fx.current?.setSpeedLines(0);
      b?.setMood(moodFor(0, r.state.fever));
      b?.setHorde(hordeFor(0, r.state));
    }
    handleEventsRef.current(r.events);
    // feedback が変わったときだけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  const onDefeat = useCallback((n: number) => {
    defeated.current = n;
  }, []);
  const onShake = useCallback((amp: number) => shake(amp), [prof.shake]); // eslint-disable-line react-hooks/exhaustive-deps

  const bgSpeed = `${Math.max(3, 40 / (1 + tier * 1.8))}s`;

  return (
    <motion.div key="hype-playing" {...pageTransition} className="w-full h-full relative overflow-hidden">
      {/* 背景（コンボで加速、FEVER で虹色） */}
      <div className="absolute inset-0 bg-stone hype-bg-scroll opacity-70" style={{ ['--hype-bg-speed' as string]: bgSpeed }} />
      {feverOn && <div className="absolute inset-0 hype-fever-wash pointer-events-none" />}

      <div ref={stageRef} className="relative w-full h-full flex flex-col items-center">
        <div className="w-full pt-3">
          <HypeHud
            ref={hudRef}
            index={currentIndex}
            total={questions.length}
            grade={selectedGrade}
            op={selectedOp}
            challenge={challenge}
          />
        </div>

        {/* 主要エリア（聖域：入力の正確さ） */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center w-full max-w-4xl gap-4 px-4 relative z-10">
          <div className="h-24 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {active && (
                <motion.div
                  key={currentIndex}
                  ref={questionRef}
                  initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 1.4, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                  className="flex items-center gap-6 md:gap-10 text-7xl md:text-8xl font-black mc-title drop-shadow-[0_8px_0_rgba(0,0,0,0.6)]"
                  data-testid="hype-question"
                >
                  <span>{currentQ.num1}</span>
                  <span className="text-yellow-400">{OP_SYMBOLS[currentQ.op]}</span>
                  <span>{currentQ.num2}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <HypeAnswerInput
            questionKey={currentIndex}
            hasRemainder={hasRemainder}
            active={active}
            locked={feedback !== null}
            onDigit={onDigit}
            onErase={onErase}
            onSubmit={onSubmit}
            extra={
              <>
                <Button onClick={onHint} disabled={feedback !== null || showHint || !active} className="h-14 text-lg w-28">
                  ヒント
                </Button>
                <Button onClick={onPass} disabled={feedback !== null || !active} className="h-14 text-lg w-28">
                  パス
                </Button>
              </>
            }
          />
        </div>

        {/* たたかいの場（ブロッくん・ブロッちゃん vs ゾンビ） */}
        <div className="relative w-full h-[36%] shrink-0">
          <BattleField ref={battleRef} fx={fx} className="w-full h-full" onDefeat={onDefeat} onShake={onShake} />
          <div className="absolute left-0 right-0 top-0 flex justify-center pointer-events-none">
            <AnimatePresence>
              {showHint && (
                <motion.span
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mc-hint text-2xl whitespace-nowrap"
                >
                  HINT: {hintText}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 正解・不正解 */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 16 }}
            className="absolute inset-x-0 top-[10%] h-[50%] flex flex-col items-center justify-center pointer-events-none z-[75]"
          >
            {feedback === 'correct' ? (
              <div className="text-[13rem] leading-none text-green-400 drop-shadow-[0_10px_0_rgba(0,0,0,0.7)]">○</div>
            ) : (
              <>
                <div className="text-[9rem] leading-none text-red-500 drop-shadow-[0_10px_0_rgba(0,0,0,0.7)]">×</div>
                <div className="mc-panel !bg-black/80 !px-6 !py-2 text-3xl font-bold text-yellow-300">
                  こたえは {currentQ.answer}
                  {hasRemainder ? ` あまり ${currentQ.remainder}` : ''} だよ！
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <BandLayer band={band} />
      <CutinLayer cutin={cutin} />
      <CountdownLayer phase={phase} />
    </motion.div>
  );
};
