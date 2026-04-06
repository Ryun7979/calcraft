import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Grade, Operation, Question } from '../types';
import { OP_SYMBOLS, OP_NAMES, pageTransition, TOTAL_QUESTIONS } from '../constants';
import { Button } from './ui/Button';
import { Panel } from './ui/Panel';

// --- Sub-components (Memoized) ---

const StatsPanel = memo(({ currentIndex, selectedGrade, selectedOp }: { currentIndex: number, selectedGrade: Grade, selectedOp: Operation }) => (
  <div className="w-full flex justify-between items-center px-4">
    <Panel className="py-2 px-6 bg-black/60">
      <span className="text-xl md:text-2xl font-bold text-white">第 {currentIndex + 1} 問 / {TOTAL_QUESTIONS}</span>
    </Panel>
    <Panel className="py-2 px-6 bg-black/60">
      <span className="text-lg md:text-xl font-bold text-blue-300">Lv {selectedGrade} {OP_NAMES[selectedOp]}</span>
    </Panel>
  </div>
));

const QuestionDisplay = memo(({ num1, num2, op }: { num1: number, num2: number, op: Operation }) => (
  <div className="flex items-center gap-8 md:gap-16 text-8xl md:text-9xl font-black mc-title drop-shadow-[0_8px_0_rgba(0,0,0,0.5)]">
    <span>{num1}</span>
    <span className="text-yellow-400">{OP_SYMBOLS[op]}</span>
    <span>{num2}</span>
  </div>
));

const HintDisplay = memo(({ showHint, hintText }: { showHint: boolean, hintText: string }) => (
  <div className="h-16 flex items-center justify-center"> {/* Height reserved to prevent jump */}
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
));

const LevelEffect = memo(({ type }: { type: 'up' | 'down' }) => (
  <motion.div
    initial={{ y: 50, opacity: 0, scale: 0.8 }}
    animate={{ y: -120, opacity: [0, 1, 1, 0], scale: 1.5 }}
    transition={{ duration: 2.5, times: [0, 0.2, 0.8, 1] }}
    className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100]"
  >
    <div className={`mc-title text-7xl md:text-9xl drop-shadow-[0_8px_0_rgba(0,0,0,0.8)] ${type === 'up' ? 'text-green-400' : 'text-yellow-300'}`}>
      {type === 'up' ? 'LEVEL UP!' : 'LEVEL DOWN...'}
    </div>
  </motion.div>
));

interface AnswerInputProps {
  hasRemainder: boolean;
  disabled: boolean;
  onSubmit: (val: string, remainderVal: string) => void;
  onValueChange?: () => void;
}

const AnswerInput = ({ hasRemainder, disabled, onSubmit, onValueChange }: AnswerInputProps) => {
  const [val, setVal] = useState('');
  const [remVal, setRemVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const remInputRef = useRef<HTMLInputElement>(null);

  // Focus management
  useEffect(() => {
    if (!disabled) {
      setVal('');
      setRemVal('');
      inputRef.current?.focus();
    }
  }, [disabled]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (/^[0-9]$/.test(e.key)) {
        if (document.activeElement !== inputRef.current && document.activeElement !== remInputRef.current) {
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (hasRemainder && e.currentTarget === inputRef.current) {
        remInputRef.current?.focus();
      } else if (val.trim() !== '') {
        onSubmit(val, remVal);
      }
    }
  };

  const handleRemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && val.trim() !== '' && remVal.trim() !== '') {
      onSubmit(val, remVal);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <div className="flex items-center gap-4 w-full max-w-2xl justify-center">
        <input
          ref={inputRef}
          type="number"
          value={val}
          onChange={(e) => { setVal(e.target.value); onValueChange?.(); }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`${hasRemainder ? 'w-1/2' : 'w-full'} bg-[#1e1e1e] border-4 border-[#373737] px-8 py-6 text-6xl md:text-7xl font-bold text-center text-white focus:outline-none focus:border-green-500 shadow-[inset_4px_4px_0_rgba(0,0,0,0.8)]`}
          placeholder="?"
        />
        {hasRemainder && (
          <>
            <span className="text-4xl md:text-5xl font-bold text-yellow-400 mc-title whitespace-nowrap">
              あまり
            </span>
            <input
              ref={remInputRef}
              type="number"
              value={remVal}
              onChange={(e) => { setRemVal(e.target.value); onValueChange?.(); }}
              onKeyDown={handleRemKeyDown}
              disabled={disabled}
              className="w-1/3 bg-[#1e1e1e] border-4 border-[#373737] px-4 py-6 text-6xl md:text-7xl font-bold text-center text-white focus:outline-none focus:border-green-500 shadow-[inset_4px_4px_0_rgba(0,0,0,0.8)]"
              placeholder="?"
            />
          </>
        )}
      </div>
      
      {/* Submit/Control buttons are here now to access local state easily */}
      <div className="flex items-center gap-6 w-full max-w-3xl mt-8">
        <Button
          variant="green"
          onClick={() => onSubmit(val, remVal)}
          disabled={val.trim() === '' || (hasRemainder && remVal.trim() === '') || disabled}
          className="text-4xl h-32 flex-1"
        >
          こたえる
        </Button>
      </div>
    </div>
  );
};

// --- Main Component ---

interface PlayingScreenProps {
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
}

export const PlayingScreen: React.FC<PlayingScreenProps> = ({
  currentIndex,
  selectedGrade,
  selectedOp,
  questions,
  feedback,
  showHint,
  hintText,
  levelChange,
  handleHint,
  handleAnswer,
}) => {
  const currentQ = questions[currentIndex];
  const hasRemainder = currentQ.op === 'div' && currentQ.remainder !== undefined;

  const handleSubmit = useCallback((v: string, r: string) => {
    handleAnswer(v, r, false);
  }, [handleAnswer]);

  return (
    <motion.div 
      key="playing"
      {...pageTransition}
      className="w-full h-full flex flex-col items-center justify-center p-4 bg-stone/60"
    >
      <div className="w-full max-w-5xl h-full flex flex-col items-center justify-between py-12">
        <StatsPanel currentIndex={currentIndex} selectedGrade={selectedGrade} selectedOp={selectedOp} />

        <div className="flex-1 flex flex-col items-center justify-center w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              className="flex flex-col items-center gap-12 w-full"
            >
              <QuestionDisplay num1={currentQ.num1} num2={currentQ.num2} op={currentQ.op} />
              
              <AnswerInput 
                hasRemainder={hasRemainder} 
                disabled={feedback !== null} 
                onSubmit={handleSubmit}
              />

              <HintDisplay showHint={showHint} hintText={hintText} />
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {levelChange && (
              <LevelEffect type={levelChange} />
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-6 w-full max-w-3xl justify-end">
           <div className="flex gap-4">
            <Button
              onClick={handleHint}
              disabled={feedback !== null || showHint}
              className="h-16 text-xl w-48"
            >
              ヒント
            </Button>
            <Button
              onClick={() => handleAnswer('', '', true)}
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
              <div className={`text-[20rem] drop-shadow-2xl ${feedback === 'correct' ? 'text-green-500' : 'text-red-500'}`}>
                {feedback === 'correct' ? '○' : '×'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
