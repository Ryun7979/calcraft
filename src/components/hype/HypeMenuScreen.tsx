import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Timer, Pencil } from 'lucide-react';
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
}

const COUNTS: QuestionCount[] = [4, 10, 20];
const MINUTES: ChallengeMinutes[] = [1, 2, 3];
const LOGO = 'CALCRAFT'.split('');
const LOGO_COLORS = ['#ff5a5a', '#ffb84d', '#ffe14d', '#7dff6a', '#4dd2ff', '#b47dff', '#ff8fb1', '#ffe14d'];
const TAPE = '★ さんすうで ゾンビを やっつけろ！ ★ ほめほめ MAX!! ★ ブロッくん と ブロッちゃん が おうえんしてるよ！ ★ なにをしても ほめちゃう！ ';

export const HypeMenuScreen: React.FC<Props> = (props) => {
  const { selectedGrade, selectedOp, questionCount, playMode, challengeMinutes, fx } = props;
  const info = DIFFICULTY_INFO[selectedOp][selectedGrade];
  const battleRef = useRef<BattleHandle>(null);

  useEffect(() => {
    hypeAudio.playBgm('title');
    const t1 = window.setTimeout(() => battleRef.current?.say('いっしょに さんすう しよう！', true, 'boy'), 500);
    const t2 = window.setTimeout(() => battleRef.current?.say('ゾンビを やっつけよう！', true, 'girl'), 1100);
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

        <div className="w-full max-w-[min(94vw,1500px)] space-y-2 px-2">
          <Panel className="!py-2 !px-3 space-y-1">
            <h2 className="text-lg lg:text-xl 2xl:text-2xl font-bold text-gray-200 text-center">レベルをえらぶ</h2>
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
            <h2 className="text-lg lg:text-xl 2xl:text-2xl font-bold text-gray-200 text-center">けいさんをえらぶ</h2>
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
              <span className="text-yellow-300 font-bold mr-2">でるもんだい</span>
              {info.tendency}
              <span className="text-green-300 font-bold ml-2">（しょうがっこう {info.grade.replace('小', '')}ねんせい くらい）</span>
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
                  れんしゅう
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
                  {playMode === 'practice' ? 'もんだいの かず' : 'なんぷんで なんもん？'}
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
                        {n}もん
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
                        {m}ぷん
                      </Button>
                    ))}
              </div>
            </div>
          </Panel>
        </div>

        <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }} className="w-full max-w-xl 2xl:max-w-3xl px-2">
          <Button variant="orange" onClick={start} className="text-3xl 2xl:text-5xl w-full h-16 2xl:h-24 flex items-center gap-4 shadow-2xl hype-start">
            <Play fill="currentColor" className="w-8 h-8" />
            {playMode === 'challenge' ? `${challengeMinutes}ぷん チャレンジ！` : 'あそぶ！'}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
