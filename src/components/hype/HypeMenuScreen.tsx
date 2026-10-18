import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Play, Timer, Pencil, SlidersHorizontal, Sparkles, Check } from 'lucide-react';
import { ChallengeMinutes, Grade, Operation, PlayMode, QuestionCount } from '../../types';
import { OP_NAMES, GRADE_OPERATIONS, pageTransition } from '../../constants';
import { DIFFICULTY_INFO } from '../../constants/difficulty';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { FxHandle } from './FxCanvas';
import { BattleField, BattleHandle } from './BattleField';
import { BlockRain } from './BlockRain';
import { hypeAudio } from '../../lib/hype/audio';
import { pickPraise } from '../../lib/hype/praise';
import { levelInfo, skillPoints } from '../../lib/hype/skills';
import { Progress } from '../../lib/storage';
import { HypeSkillDialog } from './HypeSkillDialog';

interface Props {
  selectedGrade: Grade;
  setSelectedGrade: (g: Grade) => void;
  selectedOp: Operation;
  setSelectedOp: (op: Operation) => void;
  questionCount: QuestionCount;
  setQuestionCount: (n: QuestionCount) => void;
  playMode: PlayMode;
  setPlayMode: (m: PlayMode) => void;
  challengeMinutes: ChallengeMinutes;
  setChallengeMinutes: (m: ChallengeMinutes) => void;
  startGame: (isRetry?: boolean) => void;
  fx: React.RefObject<FxHandle | null>;
  progress: Progress;
  updateProgress: (fn: (p: Progress) => void) => void;
}

const COUNTS: QuestionCount[] = [4, 10, 20];
const MINUTES: ChallengeMinutes[] = [1, 2, 3];
const LOGO = 'CALCRAFT'.split('');
const LOGO_COLORS = ['#ff5a5a', '#ffb84d', '#ffe14d', '#7dff6a', '#4dd2ff', '#b47dff', '#ff8fb1', '#ffe14d'];
const TAPE = '★ 算数でゾンビをやっつけろ！ ★ ほめほめ MAX!! ★ ブロッくんとブロッちゃんが応援してるよ！ ★ 何をしてもほめちゃう！ ';

export const HypeMenuScreen: React.FC<Props> = (props) => {
  const { selectedGrade, selectedOp, questionCount, playMode, challengeMinutes, fx } = props;
  const info = DIFFICULTY_INFO[selectedOp][selectedGrade];
  const battleRef = useRef<BattleHandle>(null);
  /** メニューは2階層：top（いまの設定・スタート・えらぶ・スキル）→ select（レベル・計算・モードをえらぶ） */
  const [view, setView] = useState<'top' | 'select'>('top');
  const [skillOpen, setSkillOpen] = useState(false);
  const lv = levelInfo(props.progress.xp);
  const points = Math.max(0, skillPoints(props.progress.xp, props.progress.skills));

  useEffect(() => {
    hypeAudio.playBgm('title');
    const t1 = window.setTimeout(() => battleRef.current?.say('いっしょに算数しよう！', true, 'boy'), 500);
    const t2 = window.setTimeout(() => battleRef.current?.say('ゾンビをやっつけよう！', true, 'girl'), 1100);
    // ときどき花火
    const fw = window.setInterval(() => {
      fx.current?.firework(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.4);
    }, 1600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearInterval(fw);
    };
  }, [fx]);

  /** えらんだだけでもほめる */
  const praise = (e: React.MouseEvent) => {
    hypeAudio.unlock();
    hypeAudio.select();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    fx.current?.burst(x, y, { count: 24, speed: 7, size: 8 });
    fx.current?.ring(x, y, '#ffe14d', 90);
    battleRef.current?.say(pickPraise('select'));
    battleRef.current?.play('cheer');
  };

  const start = (e: React.MouseEvent) => {
    praise(e);
    battleRef.current?.say(pickPraise('start'), true);
    battleRef.current?.play('jump');
    fx.current?.confetti(80);
    props.startGame(false);
  };

  /** 背景をクリックしても花火 */
  const onBgClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    hypeAudio.unlock();
    hypeAudio.firework();
    fx.current?.firework(e.clientX, e.clientY);
    fx.current?.bang(pickPraise('key'), e.clientX, e.clientY - 40, '#ffe14d', 28);
  };

  return (
    <motion.div key="hype-menu" {...pageTransition} className="w-full h-full relative overflow-hidden">
      <BlockRain className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* 下：ブロッくんとブロッちゃんがゾンビをやっつけ続けるデモ */}
      <div className="absolute left-0 right-0 bottom-0 h-[44%] pointer-events-none">
        <BattleField ref={battleRef} fx={fx} demo initialHorde={2} className="w-full h-full" />
      </div>

      {/* メニューは演出 Canvas（z-60）より上に置く：デモ戦闘のビームや文字がボタンの文字にかぶらないように */}
      <div className="relative z-[70] w-full h-full flex flex-col items-center pt-7 gap-2" onClick={onBgClick}>
        {/* ロゴ：1文字ずつはねる */}
        <div className="flex items-end gap-1 pointer-events-none">
          {LOGO.map((ch, i) => (
            <motion.span
              key={i}
              className="mc-title text-5xl md:text-7xl"
              style={{ color: LOGO_COLORS[i], textShadow: '5px 5px 0 #1d1209, 9px 9px 0 rgba(0,0,0,0.35)' }}
              animate={{ y: [0, -22, 0], rotate: [0, i % 2 ? 8 : -8, 0], scale: [1, 1.12, 1] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.09, ease: 'easeInOut' }}
            >
              {ch}
            </motion.span>
          ))}
        </div>
        <motion.div
          className="pointer-events-none"
          animate={{ rotate: [-6, 4, -6], scale: [1, 1.08, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="hype-sticker inline-block px-5 py-1 text-2xl">マシマシ!! ほめほめモード</span>
        </motion.div>

        {/* 流れるテープ */}
        <div className="w-full hype-tape py-1 pointer-events-none overflow-hidden">
          <div className="hype-tape-inner py-1 overflow-hidden whitespace-nowrap">
            <div className="hype-marquee inline-block text-xl font-bold">
              {TAPE}
              {TAPE}
            </div>
          </div>
        </div>

        {view === 'top' && (
          <div className="w-full max-w-[min(94vw,1100px)] space-y-2 px-2">
            {/* プレイヤーのレベルと経験値 */}
            <Panel className="!py-2 !px-4 flex items-center gap-4">
              <span className="mc-title text-xl lg:text-2xl text-yellow-300 whitespace-nowrap">Lv {lv.level}</span>
              <div className="hype-gauge flex-1 h-6 relative overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-300" style={{ width: `${(lv.into / lv.need) * 100}%` }} />
              </div>
              <span className="text-base lg:text-lg text-gray-200 whitespace-nowrap">
                次のレベルまで <span className="text-yellow-300 font-bold">{(lv.need - lv.into).toLocaleString()}</span>
              </span>
            </Panel>

            {/* いまの設定（このまま「あそぶ」で始められる） */}
            <Panel className="!py-2 !px-4 text-center space-y-1">
              <div className="text-2xl lg:text-3xl 2xl:text-4xl font-bold text-white whitespace-nowrap">
                <span className="text-green-300">Lv{selectedGrade}</span> {OP_NAMES[selectedOp]}
                <span className="text-gray-400 mx-3">/</span>
                {playMode === 'practice' ? (
                  <span className="text-orange-300">練習 {questionCount}問</span>
                ) : (
                  <span className="text-orange-300">チャレンジ {challengeMinutes}分</span>
                )}
              </div>
              <div className="text-base lg:text-lg 2xl:text-2xl text-gray-300">
                <span className="text-yellow-300 font-bold mr-2">出題傾向</span>
                {info.tendency}
                <span className="text-green-300 font-bold ml-2">（小学校 {info.grade.replace('小', '')}年生 相当）</span>
              </div>
            </Panel>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={(e) => {
                  praise(e);
                  setView('select');
                }}
                className="h-14 lg:h-16 text-2xl lg:text-3xl gap-3 whitespace-nowrap"
              >
                <SlidersHorizontal className="w-7 h-7" />
                えらぶ
              </Button>
              <Button
                variant={points > 0 ? 'green' : 'default'}
                onClick={(e) => {
                  praise(e);
                  setSkillOpen(true);
                }}
                className={cn('h-14 lg:h-16 text-2xl lg:text-3xl gap-3 whitespace-nowrap', points > 0 && 'hype-start')}
              >
                <Sparkles className="w-7 h-7" />
                スキル
                {points > 0 && <span className="hype-golden-tag px-2 text-lg">ポイント {points}</span>}
              </Button>
            </div>
          </div>
        )}

        {view === 'select' && (
          <div className="w-full max-w-[min(94vw,1500px)] space-y-2 px-2">
            <Panel className="!py-2 !px-3 space-y-1">
              <h2 className="text-lg lg:text-xl 2xl:text-2xl font-bold text-gray-200 text-center">レベルを選択</h2>
              <div className="grid grid-cols-10 gap-2">
                {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as Grade[]).map((g) => (
                  <Button
                    key={g}
                    variant={selectedGrade === g ? 'green' : 'default'}
                    onClick={(e) => {
                      praise(e);
                      props.setSelectedGrade(g);
                      if (!GRADE_OPERATIONS[g].includes(selectedOp)) props.setSelectedOp(GRADE_OPERATIONS[g][0]);
                    }}
                    className={cn('text-base lg:text-2xl 2xl:text-3xl h-10 lg:h-12 2xl:h-16 !px-1 whitespace-nowrap', selectedGrade === g && 'scale-110')}
                  >
                    Lv{g}
                  </Button>
                ))}
              </div>
            </Panel>

            <Panel className="!py-2 !px-3 space-y-1">
              <h2 className="text-lg lg:text-xl 2xl:text-2xl font-bold text-gray-200 text-center">計算を選択</h2>
              <div className="grid grid-cols-5 gap-2">
                {GRADE_OPERATIONS[selectedGrade].map((op) => (
                  <Button
                    key={op}
                    variant={selectedOp === op ? 'blue' : 'default'}
                    onClick={(e) => {
                      praise(e);
                      props.setSelectedOp(op);
                    }}
                    className={cn('text-lg lg:text-2xl 2xl:text-3xl h-10 lg:h-12 2xl:h-16 !px-2 whitespace-nowrap', selectedOp === op && 'scale-105')}
                  >
                    {OP_NAMES[op]}
                  </Button>
                ))}
              </div>
              <div className="text-center text-base lg:text-lg 2xl:text-2xl text-gray-300">
                <span className="text-yellow-300 font-bold mr-2">出題傾向</span>
                {info.tendency}
                <span className="text-green-300 font-bold ml-2">（小学校 {info.grade.replace('小', '')}年生 相当）</span>
              </div>
            </Panel>

            <Panel className="!py-2 !px-3">
              <div className="grid grid-cols-[auto_1fr] gap-3 items-center">
                <div className="flex gap-2">
                  <Button
                    variant={playMode === 'practice' ? 'green' : 'default'}
                    onClick={(e) => {
                      praise(e);
                      props.setPlayMode('practice');
                    }}
                    className={cn('h-12 lg:h-14 2xl:h-16 !px-4 text-lg lg:text-2xl 2xl:text-3xl flex items-center gap-2 whitespace-nowrap', playMode === 'practice' && 'scale-105')}
                  >
                    <Pencil className="w-5 h-5 lg:w-7 lg:h-7" />
                    練習
                  </Button>
                  <Button
                    variant={playMode === 'challenge' ? 'orange' : 'default'}
                    onClick={(e) => {
                      praise(e);
                      props.setPlayMode('challenge');
                    }}
                    className={cn('h-12 lg:h-14 2xl:h-16 !px-4 text-lg lg:text-2xl 2xl:text-3xl flex items-center gap-2 whitespace-nowrap', playMode === 'challenge' && 'scale-105')}
                  >
                    <Timer className="w-5 h-5 lg:w-7 lg:h-7" />
                    チャレンジ
                  </Button>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-base lg:text-xl 2xl:text-2xl font-bold text-gray-200 whitespace-nowrap">
                    {playMode === 'practice' ? '問題の数' : '何分で何問？'}
                  </span>
                  {playMode === 'practice'
                    ? COUNTS.map((n) => (
                        <Button
                          key={n}
                          variant={questionCount === n ? 'orange' : 'default'}
                          onClick={(e) => {
                            praise(e);
                            props.setQuestionCount(n);
                          }}
                          className={cn('text-base lg:text-2xl 2xl:text-3xl h-10 lg:h-14 2xl:h-16 w-20 lg:w-32 2xl:w-40 !px-2 whitespace-nowrap', questionCount === n && 'scale-110')}
                        >
                          {n}問
                        </Button>
                      ))
                    : MINUTES.map((m) => (
                        <Button
                          key={m}
                          variant={challengeMinutes === m ? 'orange' : 'default'}
                          onClick={(e) => {
                            praise(e);
                            props.setChallengeMinutes(m);
                          }}
                          className={cn('text-base lg:text-2xl 2xl:text-3xl h-10 lg:h-14 2xl:h-16 w-20 lg:w-32 2xl:w-40 !px-2 whitespace-nowrap', challengeMinutes === m && 'scale-110')}
                        >
                          {m}分
                        </Button>
                      ))}
                </div>
              </div>
            </Panel>

            <div className="flex justify-center">
              <Button
                variant="green"
                onClick={(e) => {
                  praise(e);
                  setView('top');
                }}
                className="h-12 lg:h-14 !px-8 text-xl lg:text-2xl gap-2 whitespace-nowrap"
              >
                <Check className="w-6 h-6" />
                けってい！
              </Button>
            </div>
          </div>
        )}

        <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }} className="w-full max-w-xl 2xl:max-w-3xl px-2">
          <Button variant="orange" onClick={start} className="text-3xl 2xl:text-5xl w-full h-16 2xl:h-24 flex items-center gap-4 shadow-2xl hype-start">
            <Play fill="currentColor" className="w-8 h-8" />
            {playMode === 'challenge' ? `${challengeMinutes}分チャレンジ！` : 'あそぶ！'}
          </Button>
        </motion.div>
      </div>

      <AnimatePresence>
        {skillOpen && (
          <HypeSkillDialog
            progress={props.progress}
            updateProgress={props.updateProgress}
            fx={fx}
            onLearn={(name) => {
              battleRef.current?.say(`「${name}」を覚えた！`, true, 'boy');
              battleRef.current?.play('jump');
            }}
            onClose={() => setSkillOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
