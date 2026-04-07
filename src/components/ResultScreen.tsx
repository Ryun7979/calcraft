import React from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Home } from 'lucide-react';
import { AnsweredQuestion } from '../types';
import { OP_SYMBOLS, pageTransition, TOTAL_QUESTIONS } from '../constants';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Panel } from './ui/Panel';

interface ResultScreenProps {
  answers: AnsweredQuestion[];
  startGame: (isRetry?: boolean) => void;
  backToMenu: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  answers,
  startGame,
  backToMenu,
}) => {
  const correctCount = answers.filter(a => a.isCorrect).length;

  return (
    <motion.div 
      key="result"
      {...pageTransition}
      className="w-full h-full flex flex-col items-center justify-center p-6 bg-stone"
    >
      <Panel className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-stone p-4 border-4">
        <div className="text-center mb-4">
          <h2 className="mc-title text-2xl md:text-3xl mb-2 text-yellow-400">けっか発表！</h2>
          <Panel className="inline-block px-6 py-2 bg-black/40 border-black mt-2">
            <span className="text-xl font-bold">
              {TOTAL_QUESTIONS}問中 <span className="text-3xl text-yellow-400 mx-2">{correctCount}</span> 問正解！
            </span>
          </Panel>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2">
          {answers.map((ans, i) => (
            <Panel key={i} className={cn(
              "p-3 flex items-center justify-between border-4",
              ans.isCorrect ? "border-green-500 bg-green-900/20" : "border-red-500 bg-red-900/20"
            )}>
              <div className="flex items-center gap-4">
                <span className="text-gray-400 font-bold text-sm">Q{i + 1}</span>
                <span className="text-xl font-bold tracking-widest text-white">
                  {ans.num1} {OP_SYMBOLS[ans.op]} {ans.num2} = {ans.answer}
                  {ans.op === 'div' && ans.remainder !== undefined && (
                    <span className="text-lg ml-2 text-yellow-400">あまり {ans.remainder}</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="block text-xs text-gray-400 mb-0.5">あなたのこたえ</span>
                  <span className="text-lg font-bold">
                    {ans.userAnswer !== null ? ans.userAnswer : 'ー'}
                    {ans.op === 'div' && ans.remainder !== undefined && (
                      <span className="text-base ml-2">
                        あまり {ans.userRemainder !== null && ans.userRemainder !== undefined ? ans.userRemainder : 'ー'}
                      </span>
                    )}
                  </span>
                </div>
                <div className="text-2xl">
                  {ans.isCorrect ? (
                    <span className="text-green-500">○</span>
                  ) : (
                    <span className="text-red-500">×</span>
                  )}
                </div>
              </div>
            </Panel>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 h-12">
          <Button
            variant="green"
            onClick={() => startGame(true)}
            className="text-base flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            もういちど
          </Button>
          <Button
            variant="blue"
            onClick={backToMenu}
            className="text-base flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            タイトル
          </Button>
        </div>
      </Panel>
    </motion.div>
  );
};
