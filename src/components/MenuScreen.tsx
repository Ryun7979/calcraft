import React from 'react';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { Grade, Operation } from '../types';
import { OP_NAMES, GRADE_OPERATIONS, pageTransition } from '../constants';
import { DIFFICULTY_INFO } from '../constants/difficulty';
import { playClickSound } from '../lib/audio';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Panel } from './ui/Panel';

interface MenuScreenProps {
  selectedGrade: Grade;
  setSelectedGrade: (g: Grade) => void;
  selectedOp: Operation;
  setSelectedOp: (op: Operation) => void;
  startGame: () => void;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({
  selectedGrade,
  setSelectedGrade,
  selectedOp,
  setSelectedOp,
  startGame,
}) => {
  const info = DIFFICULTY_INFO[selectedOp][selectedGrade];

  return (
    <motion.div
      key="menu"
      {...pageTransition}
      className="w-full h-full flex flex-col items-center justify-center p-3 md:p-5 space-y-4 backdrop-brightness-50"
    >
      <div className="flex flex-col items-center space-y-2">
        <h1 className="mc-title text-4xl md:text-6xl tracking-tight text-center">
          CALCRAFT
        </h1>
        <span className="text-yellow-400 font-bold transform -rotate-12 bg-black/40 px-4 py-1 text-lg animate-pulse">
          算数であそぼう！
        </span>
      </div>

      <div className="w-full max-w-4xl space-y-3">
        <Panel className="space-y-3">
          <h2 className="text-lg md:text-xl font-bold text-gray-300 text-center flex items-center justify-center gap-3">
            レベルを選択
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as Grade[]).map((g) => (
              <Button
                key={g}
                variant={selectedGrade === g ? 'green' : 'default'}
                onClick={() => {
                  playClickSound();
                  setSelectedGrade(g);
                  if (!GRADE_OPERATIONS[g].includes(selectedOp)) {
                    setSelectedOp(GRADE_OPERATIONS[g][0]);
                  }
                }}
                className={cn("text-base h-10", selectedGrade === g && "scale-105")}
              >
                Lv {g}
              </Button>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-3">
          <h2 className="text-lg md:text-xl font-bold text-gray-300 text-center">計算を選択</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {GRADE_OPERATIONS[selectedGrade].map((op) => (
              <Button
                key={op}
                variant={selectedOp === op ? 'blue' : 'default'}
                onClick={() => {
                  playClickSound();
                  setSelectedOp(op);
                }}
                className={cn("text-base min-w-[110px] h-10", selectedOp === op && "scale-105")}
              >
                {OP_NAMES[op]}
              </Button>
            ))}
          </div>
        </Panel>

        <Panel className="border-2 border-yellow-500/30 bg-black/60 py-3">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 text-gray-400 text-sm">
              <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 border border-yellow-500/30 font-bold">出題傾向</span>
              <span className="tracking-wide">{info.tendency}</span>
            </div>
            <div className="text-xl font-bold text-white flex items-center gap-3">
              <span className="text-sm text-gray-400 font-normal">学習内容:</span>
              <span className="text-green-400 tracking-wider">小学校 {info.grade.replace('小', '')}年生 相当</span>
            </div>
          </div>
        </Panel>
      </div>

      <Button
        variant="orange"
        onClick={startGame}
        className="text-3xl w-full max-w-xl h-14 flex items-center gap-4 shadow-2xl"
      >
        <Play fill="currentColor" className="w-8 h-8" />
        あそぶ！
      </Button>
    </motion.div>
  );
};
