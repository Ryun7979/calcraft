import React from 'react';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { Grade, Operation } from '../types';
import { OP_NAMES, GRADE_OPERATIONS, pageTransition } from '../constants';
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
  return (
    <motion.div 
      key="menu"
      {...pageTransition}
      className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8 space-y-16 backdrop-brightness-50"
    >
      <div className="flex flex-col items-center space-y-4">
        <h1 className="mc-title text-7xl md:text-9xl tracking-tight text-center">
          CALCRAFT
        </h1>
        <span className="text-yellow-400 font-bold transform -rotate-12 bg-black/40 px-6 py-2 text-3xl animate-pulse">
          算数であそぼう！
        </span>
      </div>
      
      <div className="w-full max-w-5xl space-y-12">
        <Panel className="space-y-8">
          <h2 className="text-2xl md:text-4xl font-bold text-gray-300 text-center flex items-center justify-center gap-3">
            レベルを選択
          </h2>
          <div className="grid grid-cols-5 gap-4">
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
                className={cn("text-2xl h-20", selectedGrade === g && "scale-105")}
              >
                Lv {g}
              </Button>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-8">
          <h2 className="text-2xl md:text-4xl font-bold text-gray-300 text-center">計算を選択</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {GRADE_OPERATIONS[selectedGrade].map((op) => (
              <Button
                key={op}
                variant={selectedOp === op ? 'blue' : 'default'}
                onClick={() => {
                  playClickSound();
                  setSelectedOp(op);
                }}
                className={cn("text-3xl min-w-[200px] h-20", selectedOp === op && "scale-105")}
              >
                {OP_NAMES[op]}
              </Button>
            ))}
          </div>
        </Panel>
      </div>

      <Button
        variant="orange"
        onClick={startGame}
        className="text-6xl w-full max-w-2xl h-40 mt-12 flex items-center gap-6"
      >
        <Play fill="currentColor" className="w-16 h-16" />
        あそぶ！
      </Button>
    </motion.div>
  );
};
