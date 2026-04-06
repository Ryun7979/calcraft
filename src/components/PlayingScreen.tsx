import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Grade, Operation, Question } from '../types';
import { OP_SYMBOLS, OP_NAMES, pageTransition, TOTAL_QUESTIONS } from '../constants';
import { Button } from './ui/Button';
import { Panel } from './ui/Panel';

interface PlayingScreenProps {
  currentIndex: number;
  selectedGrade: Grade;
  selectedOp: Operation;
  questions: Question[];
  inputValue: string;
  setInputValue: (val: string) => void;
  remainderInputValue: string;
  setRemainderInputValue: (val: string) => void;
  feedback: 'correct' | 'incorrect' | null;
  showHint: boolean;
  hintText: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  remainderInputRef: React.RefObject<HTMLInputElement | null>;
  handleHint: () => void;
  handleAnswer: (skipped?: boolean) => void;
}

export const PlayingScreen: React.FC<PlayingScreenProps> = ({
  currentIndex,
  selectedGrade,
  selectedOp,
  questions,
  inputValue,
  setInputValue,
  remainderInputValue,
  setRemainderInputValue,
  feedback,
  showHint,
  hintText,
  inputRef,
  remainderInputRef,
  handleHint,
  handleAnswer,
}) => {
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 正解・不正解のフィードバック中は入力を受け付けない
      if (feedback !== null) return;
      
      // 数字キー (0-9) が押されたが、どの入力ボックスにもフォーカスがない場合にフォーカスを移す
      if (/^[0-9]$/.test(e.key)) {
        if (document.activeElement !== inputRef.current && document.activeElement !== remainderInputRef.current) {
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [inputRef, feedback]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (currentQ.remainder !== undefined && e.currentTarget === inputRef.current) {
        // 商を入力してEnterを押したら余り欄へ移動
        remainderInputRef.current?.focus();
      } else if (inputValue.trim() !== '') {
        // 余り入力済み（または不要）でEnterを押したら回答
        handleAnswer();
      }
    }
  };

  const handleRemainderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== '' && remainderInputValue.trim() !== '') {
      handleAnswer();
    }
  };

  const currentQ = questions[currentIndex];

  return (
    <motion.div 
      key="playing"
      {...pageTransition}
      className="w-full h-full flex flex-col items-center justify-center p-4 bg-stone/60"
    >
      <div className="w-full max-w-5xl h-full flex flex-col items-center justify-between py-12">
        <div className="w-full flex justify-between items-center px-4">
          <Panel className="py-2 px-6 bg-black/60">
            <span className="text-xl md:text-2xl font-bold text-white">第 {currentIndex + 1} 問 / {TOTAL_QUESTIONS}</span>
          </Panel>
          <Panel className="py-2 px-6 bg-black/60">
            <span className="text-lg md:text-xl font-bold text-blue-300">Lv {selectedGrade} {OP_NAMES[selectedOp]}</span>
          </Panel>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              className="flex flex-col items-center gap-12"
            >
              <div className="flex items-center gap-8 md:gap-16 text-8xl md:text-9xl font-black mc-title drop-shadow-[0_8px_0_rgba(0,0,0,0.5)]">
                <span>{currentQ.num1}</span>
                <span className="text-yellow-400">{OP_SYMBOLS[currentQ.op]}</span>
                <span>{currentQ.num2}</span>
              </div>
              
              <div className="flex flex-col items-center gap-8 w-full">
                <div className="flex items-center gap-4 w-full max-w-2xl justify-center">
                   <input
                    ref={inputRef}
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={feedback !== null}
                    className={`${currentQ.remainder !== undefined ? 'w-1/2' : 'w-full'} bg-[#1e1e1e] border-4 border-[#373737] px-8 py-6 text-6xl md:text-7xl font-bold text-center text-white focus:outline-none focus:border-green-500 shadow-[inset_4px_4px_0_rgba(0,0,0,0.8)]`}
                    placeholder="?"
                  />
                  {currentQ.remainder !== undefined && (
                    <>
                      <span className="text-4xl md:text-5xl font-bold text-yellow-400 mc-title whitespace-nowrap">
                        あまり
                      </span>
                      <input
                        ref={remainderInputRef}
                        type="number"
                        value={remainderInputValue}
                        onChange={(e) => setRemainderInputValue(e.target.value)}
                        onKeyDown={handleRemainderKeyDown}
                        disabled={feedback !== null}
                        className="w-1/3 bg-[#1e1e1e] border-4 border-[#373737] px-4 py-6 text-6xl md:text-7xl font-bold text-center text-white focus:outline-none focus:border-green-500 shadow-[inset_4px_4px_0_rgba(0,0,0,0.8)]"
                        placeholder="?"
                      />
                    </>
                  )}
                </div>
                <AnimatePresence>
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-center z-20"
                    >
                      <span className="mc-hint text-3xl border-black inline-block whitespace-nowrap">
                        HINT: {hintText}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-6 w-full max-w-3xl">
          <Button
            variant="green"
            onClick={() => handleAnswer(false)}
            disabled={inputValue.trim() === '' || (currentQ.remainder !== undefined && remainderInputValue.trim() === '') || feedback !== null}
            className="text-4xl h-32 flex-1"
          >
            こたえる
          </Button>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleHint}
              disabled={feedback !== null || showHint}
              className="h-16 text-xl w-48"
            >
              ヒント
            </Button>
            <Button
              onClick={() => handleAnswer(true)}
              disabled={feedback !== null}
              className="h-16 text-xl w-48"
            >
              パス
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            >
              {feedback === 'correct' ? (
                <div className="text-[20rem] text-green-500 drop-shadow-2xl">○</div>
              ) : (
                <div className="text-[20rem] text-red-500 drop-shadow-2xl">×</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
