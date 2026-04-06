import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, RotateCcw, Home } from 'lucide-react';
import { cn } from './lib/utils';
import { playClickSound, playCorrectSound, playIncorrectSound } from './lib/audio';

type Grade = 1 | 2 | 3 | 4 | 5 | 6;
type Operation = 'add' | 'sub' | 'mul' | 'div';
type GameState = 'menu' | 'playing' | 'result';

interface Question {
  num1: number;
  num2: number;
  op: Operation;
  answer: number;
}

interface AnsweredQuestion extends Question {
  userAnswer: number | null;
  isCorrect: boolean;
}

const OP_SYMBOLS: Record<Operation, string> = {
  add: '+',
  sub: '-',
  mul: '×',
  div: '÷',
};

const OP_NAMES: Record<Operation, string> = {
  add: 'たしざん',
  sub: 'ひきざん',
  mul: 'かけざん',
  div: 'わりざん',
};

const GRADE_OPERATIONS: Record<Grade, Operation[]> = {
  1: ['add', 'sub'],
  2: ['add', 'sub', 'mul'],
  3: ['add', 'sub', 'mul', 'div'],
  4: ['add', 'sub', 'mul', 'div'],
  5: ['add', 'sub', 'mul', 'div'],
  6: ['add', 'sub', 'mul', 'div'],
};

const TOTAL_QUESTIONS = 4;

const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: "easeOut" }
};

const generateQuestion = (grade: Grade, op: Operation): Question => {
  let num1 = 0, num2 = 0, answer = 0;
  const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  // 難易度調整用のヘルパー：切りの良い数字を生成
  const getNiceNumber = (min: number, max: number, factor: number = 10) => {
    const minFactor = Math.ceil(min / factor);
    const maxFactor = Math.floor(max / factor);
    return random(minFactor, maxFactor) * factor;
  };

  switch (op) {
    case 'add':
      if (grade === 1) { num1 = random(1, 9); num2 = random(1, 9); }
      else if (grade === 2) { 
        // 2桁 + 2桁：50%で切りの良い数字
        num1 = Math.random() < 0.5 ? getNiceNumber(10, 99) : random(10, 99);
        num2 = Math.random() < 0.5 ? getNiceNumber(10, 99) : random(10, 99);
      }
      else if (grade === 3) { num1 = random(100, 999); num2 = random(100, 999); }
      else { num1 = getNiceNumber(1000, 9999, 100); num2 = getNiceNumber(1000, 9999, 100); }
      answer = num1 + num2;
      break;
    case 'sub':
      if (grade === 1) { num1 = random(10, 18); num2 = random(1, 9); }
      else if (grade === 2) { num1 = random(20, 99); num2 = random(10, num1); }
      else if (grade === 3) { num1 = random(100, 999); num2 = random(10, num1); }
      else { num1 = getNiceNumber(1000, 9999, 100); num2 = getNiceNumber(100, num1, 100); }
      answer = num1 - num2;
      break;
    case 'mul':
      if (grade === 2) { num1 = random(1, 9); num2 = random(1, 9); } // 九九
      else if (grade === 3) { num1 = random(10, 99); num2 = random(2, 9); } // 2桁×1桁
      else if (grade === 4) { num1 = getNiceNumber(10, 99, 10); num2 = random(2, 9); } // 2桁(10の倍数)×1桁
      else { num1 = random(100, 999); num2 = random(10, 99); }
      answer = num1 * num2;
      break;
    case 'div':
      if (grade === 3) { num2 = random(2, 9); answer = random(2, 9); num1 = num2 * answer; } // 九九の逆
      else if (grade === 4) { num2 = random(2, 9); answer = random(10, 99); num1 = num2 * answer; }
      else { num2 = random(10, 99); answer = random(10, 99); num1 = num2 * answer; }
      break;
  }
  return { num1, num2, op, answer };
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [selectedGrade, setSelectedGrade] = useState<Grade>(1);
  const [selectedOp, setSelectedOp] = useState<Operation>('add');
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnsweredQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShowHint(false);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
  }, [currentIndex]);

  useEffect(() => {
    if (gameState === 'playing' && feedback === null) {
      inputRef.current?.focus();
    }
  }, [gameState, currentIndex, feedback]);

  const getFontSizeClass = (num1: number, num2: number) => {
    const totalDigits = num1.toString().length + num2.toString().length;
    if (totalDigits <= 3) return "text-[4rem] sm:text-[6rem] md:text-[8rem] lg:text-[12rem]";
    if (totalDigits <= 5) return "text-[3.5rem] sm:text-[5rem] md:text-[7rem] lg:text-[9rem]";
    if (totalDigits <= 7) return "text-[2.5rem] sm:text-[4rem] md:text-[5rem] lg:text-[7rem]";
    return "text-[2rem] sm:text-[3rem] md:text-[4rem] lg:text-[5rem]";
  };

  const handleHint = () => {
    if (feedback !== null || showHint) return;
    playClickSound();
    const currentQ = questions[currentIndex];
    const ansStr = currentQ.answer.toString();
    let text = '';
    if (ansStr.length === 1) {
       text = `こたえは ${currentQ.answer >= 5 ? '5いじょう' : '5よりちいさい'} だよ！`;
    } else {
       text = `一の位（いちのくらい）は「${currentQ.answer % 10}」だよ！`;
    }
    setHintText(text);
    setShowHint(true);

    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => {
      setShowHint(false);
    }, 3000);
  };

  const startGame = () => {
    playClickSound();
    const newQuestions = Array.from({ length: TOTAL_QUESTIONS }, () => generateQuestion(selectedGrade, selectedOp));
    setQuestions(newQuestions);
    setAnswers([]);
    setCurrentIndex(0);
    setInputValue('');
    setFeedback(null);
    setGameState('playing');
  };

  const handleAnswer = (skipped: boolean = false) => {
    if (feedback !== null) return;

    const currentQ = questions[currentIndex];
    const parsedInput = parseInt(inputValue, 10);
    const isCorrect = !skipped && !isNaN(parsedInput) && parsedInput === currentQ.answer;

    if (isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }

    setFeedback(isCorrect ? 'correct' : 'incorrect');

    const answeredQ: AnsweredQuestion = {
      ...currentQ,
      userAnswer: skipped || isNaN(parsedInput) ? null : parsedInput,
      isCorrect,
    };

    setTimeout(() => {
      setAnswers((prev) => [...prev, answeredQ]);
      setFeedback(null);
      setInputValue('');
      
      if (currentIndex + 1 < TOTAL_QUESTIONS) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setGameState('result');
      }
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      handleAnswer();
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center p-2 md:p-4 overflow-hidden">
      <div className="w-full h-full max-w-screen-2xl bg-white/90 backdrop-blur-md rounded-[2rem] shadow-2xl overflow-y-auto relative border-4 md:border-8 border-white flex flex-col">
        
        <AnimatePresence mode="wait">
        {gameState === 'menu' && (
          <motion.div 
            key="menu"
            {...pageTransition}
            className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 space-y-8 md:space-y-12 min-h-max"
          >
            <h1 className="text-5xl md:text-7xl font-black text-green-500 drop-shadow-sm tracking-widest">
              さんすうドリル
            </h1>
            
            <div className="flex flex-col items-center space-y-8 md:space-y-10 w-full max-w-5xl">
              <div className="w-full">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-500 mb-4 md:mb-6 text-center">むずかしさを選んでね</h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-6">
                  {([1, 2, 3, 4, 5, 6] as Grade[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => {
                        playClickSound();
                        setSelectedGrade(g);
                        if (!GRADE_OPERATIONS[g].includes(selectedOp)) {
                          setSelectedOp(GRADE_OPERATIONS[g][0]);
                        }
                      }}
                      className={cn(
                        "py-3 md:py-6 rounded-xl md:rounded-2xl font-bold text-2xl md:text-3xl transition-all",
                        selectedGrade === g 
                          ? "bg-green-500 text-white shadow-lg scale-105" 
                          : "bg-gray-100 text-gray-600 hover:bg-green-100"
                      )}
                    >
                      Lv {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-500 mb-4 md:mb-6 text-center">けいさんをえらんでね</h2>
                <div className="flex flex-wrap justify-center gap-3 md:gap-6">
                  {GRADE_OPERATIONS[selectedGrade].map((op) => (
                    <button
                      key={op}
                      onClick={() => {
                        playClickSound();
                        setSelectedOp(op);
                      }}
                      className={cn(
                        "px-6 md:px-10 py-3 md:py-6 rounded-xl md:rounded-2xl font-bold text-2xl md:text-3xl transition-all min-w-[120px] md:min-w-[160px]",
                        selectedOp === op 
                          ? "bg-blue-500 text-white shadow-lg scale-105" 
                          : "bg-gray-100 text-gray-600 hover:bg-blue-100"
                      )}
                    >
                      {OP_NAMES[op]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={startGame}
              className="mt-6 md:mt-12 px-10 md:px-20 py-5 md:py-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-black text-3xl md:text-5xl shadow-xl hover:scale-105 transition-all flex items-center gap-3 md:gap-6 shrink-0"
            >
              <Play fill="currentColor" className="w-10 h-10 md:w-14 md:h-14" />
              スタート！
            </button>
          </motion.div>
        )}

        {gameState === 'playing' && questions.length > 0 && (
          <motion.div 
            key="playing"
            {...pageTransition}
            className="flex-1 flex flex-col p-4 md:p-8 lg:p-12 min-h-0"
          >
            <div className="flex justify-between items-center mb-4 md:mb-8 shrink-0">
              <div className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-500 bg-gray-100 px-4 md:px-8 lg:px-10 py-2 md:py-3 lg:py-4 rounded-full shadow-inner">
                第 {currentIndex + 1} 問 / {TOTAL_QUESTIONS}
              </div>
              <div className="text-lg md:text-2xl lg:text-3xl font-bold text-blue-500 bg-blue-50 px-4 md:px-8 lg:px-10 py-2 md:py-3 lg:py-4 rounded-full border-2 border-blue-100">
                Lv {selectedGrade} の {OP_NAMES[selectedOp]}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-between relative min-h-0">
              <div className="flex-1 flex items-center justify-center min-h-0 w-full px-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 0.8, x: 0 }}
                    animate={
                      feedback === 'incorrect'
                        ? { opacity: 1, scale: 1, x: [-10, 10, -10, 10, 0] }
                        : { opacity: 1, scale: 1, x: 0 }
                    }
                    exit={{ opacity: 0, scale: 1.2, x: 0 }}
                    transition={
                      feedback === 'incorrect'
                        ? { duration: 0.4 }
                        : { duration: 0.3 }
                    }
                    className={cn(
                      "font-black text-gray-800 tracking-wider flex items-center justify-center gap-2 sm:gap-4 md:gap-8 lg:gap-12 w-full whitespace-nowrap",
                      getFontSizeClass(questions[currentIndex].num1, questions[currentIndex].num2)
                    )}
                  >
                    <span>{questions[currentIndex].num1}</span>
                    <span className="text-blue-500">{OP_SYMBOLS[questions[currentIndex].op]}</span>
                    <span>{questions[currentIndex].num2}</span>
                    <span className="text-gray-400">=</span>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex flex-col items-center gap-4 md:gap-6 lg:gap-10 z-10 shrink-0 mt-4">
                <div className="h-8 md:h-12 flex items-center justify-center -mb-2 md:-mb-4">
                  <AnimatePresence>
                    {showHint && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-yellow-700 font-bold text-sm md:text-lg lg:text-xl bg-yellow-100 px-4 md:px-6 py-1 md:py-2 rounded-full shadow-sm border-2 border-yellow-300"
                      >
                        💡 {hintText}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <input
                  ref={inputRef}
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={feedback !== null}
                  className="w-48 sm:w-56 md:w-80 lg:w-96 text-center text-4xl md:text-5xl lg:text-7xl font-bold py-2 md:py-4 lg:py-6 rounded-xl lg:rounded-3xl border-4 border-gray-200 focus:border-green-500 focus:outline-none shadow-inner transition-colors bg-white"
                  placeholder="こたえ"
                />
                
                <div className="flex items-center gap-3 md:gap-6 lg:gap-8">
                  <button
                    onClick={() => handleAnswer(false)}
                    disabled={inputValue.trim() === '' || feedback !== null}
                    className="px-8 md:px-12 lg:px-20 py-4 md:py-6 lg:py-8 bg-green-500 disabled:bg-gray-300 text-white rounded-2xl lg:rounded-3xl font-bold text-2xl md:text-3xl lg:text-5xl shadow-lg hover:bg-green-600 transition-all active:scale-95"
                  >
                    こたえる
                  </button>
                  <div className="flex flex-col gap-2 md:gap-3">
                    <button
                      onClick={handleHint}
                      disabled={feedback !== null || showHint}
                      className="px-4 md:px-6 lg:px-8 py-2 md:py-3 lg:py-4 bg-yellow-400 disabled:bg-yellow-200 text-yellow-900 disabled:text-yellow-600 rounded-xl lg:rounded-2xl font-bold text-sm md:text-base lg:text-xl shadow-md hover:bg-yellow-500 transition-all active:scale-95"
                    >
                      ヒント
                    </button>
                    <button
                      onClick={() => handleAnswer(true)}
                      disabled={feedback !== null}
                      className="px-4 md:px-6 lg:px-8 py-2 md:py-3 lg:py-4 bg-gray-200 text-gray-600 rounded-xl lg:rounded-2xl font-bold text-sm md:text-base lg:text-xl shadow-md hover:bg-gray-300 transition-all active:scale-95"
                    >
                      わかりません
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", bounce: 0.6, duration: 0.6 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                  >
                    {feedback === 'correct' ? (
                      <svg className="text-red-500 w-72 h-72 md:w-[40rem] md:h-[40rem] drop-shadow-2xl opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="8" />
                      </svg>
                    ) : (
                      <X className="text-blue-500 w-72 h-72 md:w-[40rem] md:h-[40rem] drop-shadow-2xl opacity-90" strokeWidth={4} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {gameState === 'result' && (
          <motion.div 
            key="result"
            {...pageTransition}
            className="flex-1 flex flex-col p-6 md:p-12 min-h-0"
          >
            <div className="text-center mb-6 md:mb-10 shrink-0">
              <h2 className="text-4xl md:text-6xl font-black text-gray-800 mb-4 md:mb-6">けっかひょう</h2>
              <div className="text-3xl md:text-5xl font-bold text-orange-500 bg-orange-50 inline-block px-10 md:px-16 py-3 md:py-6 rounded-full border-4 border-orange-100">
                {TOTAL_QUESTIONS}問中 <span className="text-5xl md:text-7xl text-orange-600 mx-2">{answers.filter(a => a.isCorrect).length}</span> 問せいかい！
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl md:rounded-3xl p-6 md:p-8 border-4 border-gray-100 shadow-inner mb-6 md:mb-10 min-h-[150px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {answers.map((ans, i) => (
                  <div key={i} className={cn(
                    "flex items-center justify-between p-6 md:p-8 rounded-xl md:rounded-2xl border-4",
                    ans.isCorrect ? "bg-red-50 border-red-100" : "bg-blue-50 border-blue-100"
                  )}>
                    <div className="flex items-center gap-4 md:gap-8">
                      <div className="text-2xl md:text-3xl font-bold text-gray-400 w-10 md:w-12">Q{i + 1}</div>
                      <div className="text-2xl md:text-4xl font-bold text-gray-700 tracking-wider">
                        {ans.num1} {OP_SYMBOLS[ans.op]} {ans.num2} = {ans.answer}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-8">
                      <div className="text-xl md:text-2xl font-bold text-gray-500 hidden sm:block">
                        あなたのこたえ: {ans.userAnswer !== null ? ans.userAnswer : 'ー'}
                      </div>
                      <div className="text-xl md:text-2xl font-bold text-gray-500 sm:hidden">
                        {ans.userAnswer !== null ? ans.userAnswer : 'ー'}
                      </div>
                      {ans.isCorrect ? (
                        <svg className="text-red-500 w-8 h-8 md:w-10 md:h-10 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="8" />
                        </svg>
                      ) : (
                        <X className="text-blue-500 w-8 h-8 md:w-10 md:h-10 shrink-0" strokeWidth={6} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-6 md:gap-10 shrink-0">
              <button
                onClick={startGame}
                className="px-8 md:px-12 py-4 md:py-6 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold text-2xl md:text-3xl shadow-lg hover:scale-105 transition-all flex items-center gap-3 md:gap-4"
              >
                <RotateCcw className="w-8 h-8 md:w-10 md:h-10" />
                もういちど
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  setGameState('menu');
                }}
                className="px-8 md:px-12 py-4 md:py-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-bold text-2xl md:text-3xl shadow-lg hover:scale-105 transition-all flex items-center gap-3 md:gap-4"
              >
                <Home className="w-8 h-8 md:w-10 md:h-10" />
                メニューへ
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

      </div>
    </div>
  );
}
