import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, RotateCcw, Home, Info } from 'lucide-react';
import { cn } from './lib/utils';
import { playClickSound, playCorrectSound, playIncorrectSound } from './lib/audio';

type Grade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
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
  1: ['add', 'sub', 'mul', 'div'],
  2: ['add', 'sub', 'mul', 'div'],
  3: ['add', 'sub', 'mul', 'div'],
  4: ['add', 'sub', 'mul', 'div'],
  5: ['add', 'sub', 'mul', 'div'],
  6: ['add', 'sub', 'mul', 'div'],
  7: ['add', 'sub', 'mul', 'div'],
  8: ['add', 'sub', 'mul', 'div'],
  9: ['add', 'sub', 'mul', 'div'],
  10: ['add', 'sub', 'mul', 'div'],
};

const TOTAL_QUESTIONS = 4;

const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

const generateQuestion = (grade: Grade, op: Operation): Question => {
  let num1 = 0, num2 = 0, answer = 0;
  const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  const getNiceNumber = (min: number, max: number, factor: number = 10) => {
    const minFactor = Math.ceil(min / factor);
    const maxFactor = Math.floor(max / factor);
    return random(minFactor, maxFactor) * factor;
  };

  switch (op) {
    case 'add':
      if (grade === 1) { // 1桁＋1桁（和が10以下）
        num1 = random(1, 9);
        num2 = random(1, 10 - num1);
      } else if (grade === 2) { // 1桁＋1桁（繰り上がりあり）
        num1 = random(2, 9);
        num2 = random(11 - num1, 9);
      } else if (grade === 3) { // 2桁＋1桁（繰り上がりなし）
        num1 = random(10, 89);
        num2 = random(1, 9 - (num1 % 10));
      } else if (grade === 4) { // 2桁＋1桁（繰り上がりあり）
        num1 = random(11, 89);
        num2 = random(10 - (num1 % 10), 9);
      } else if (grade === 5) { // 2桁＋2桁（10の倍数）
        num1 = getNiceNumber(10, 80);
        num2 = getNiceNumber(10, 90 - num1);
      } else if (grade === 6) { // 2桁＋2桁（ゾロ目）
        const d1 = random(1, 4);
        const d2 = random(1, 9 - d1);
        num1 = d1 * 11;
        num2 = d2 * 11;
      } else if (grade === 7) { // 2桁＋2桁（全桁繰り上がりなし）
        const n1_1 = random(1, 8);
        const n1_0 = random(0, 8);
        const n2_1 = random(1, 9 - n1_1);
        const n2_0 = random(1, 9 - n1_0);
        num1 = n1_1 * 10 + n1_0;
        num2 = n2_1 * 10 + n2_0;
      } else if (grade === 8) { // 2桁＋2桁（ランダム）
        num1 = random(11, 89);
        num2 = random(11, 99 - num1);
      } else if (grade === 9) { // 3桁＋2桁（一方がキリの良い数）
        num1 = Math.random() < 0.5 ? getNiceNumber(100, 900, 100) : random(100, 999);
        num2 = num1 >= 1000 ? random(10, 99) : (num1 % 100 === 0 ? random(10, 99) : getNiceNumber(10, 90));
      } else { // 3桁＋3桁
        num1 = random(100, 999);
        num2 = random(100, 999);
      }
      answer = num1 + num2;
      break;

    case 'sub':
      if (grade === 1) { // 1桁－1桁（繰り下がりなし）
        num1 = random(2, 9);
        num2 = random(1, num1);
      } else if (grade === 2) { // 10代－1桁（繰り下がりあり）
        num2 = random(2, 9);
        num1 = random(11, 9 + num2 - 1);
        if (num1 >= 10 + num2) num1 = 10 + num2 - 1; // Ensure borrowing
        // Re-adjust: num1 must be 11-18, num2 must be > num1 % 10
        num1 = random(11, 18);
        num2 = random((num1 % 10) + 1, 9);
      } else if (grade === 3) { // 2桁－1桁（繰り下がりなし）
        num1 = random(11, 99);
        num2 = random(1, num1 % 10 || 1);
      } else if (grade === 4) { // 2桁－1桁（繰り下がりあり）
        num1 = random(21, 98);
        num2 = random((num1 % 10) + 1, 9);
      } else if (grade === 5) { // 2桁－2桁（10の倍数）
        num1 = getNiceNumber(20, 90);
        num2 = getNiceNumber(10, num1 - 10);
      } else if (grade === 6) { // 2桁－2桁（ゾロ目）
        num2 = random(1, 4) * 11;
        num1 = random(num2 / 11 + 1, 9) * 11;
      } else if (grade === 7) { // 2桁－2桁（繰り下がりなし）
        const n1_1 = random(2, 9);
        const n1_0 = random(1, 9);
        const n2_1 = random(1, n1_1 - 1);
        const n2_0 = random(1, n1_0);
        num1 = n1_1 * 10 + n1_0;
        num2 = n2_1 * 10 + n2_0;
      } else if (grade === 8) { // 2桁－2桁（ランダム）
        num1 = random(21, 99);
        num2 = random(11, num1 - 1);
      } else if (grade === 9) { // 3桁－2桁（一方がキリの良い数）
        num1 = getNiceNumber(200, 900, 100);
        num2 = random(11, 99);
      } else { // 3桁－3桁
        num1 = random(200, 999);
        num2 = random(100, num1 - 1);
      }
      answer = num1 - num2;
      break;

    case 'mul':
      if (grade <= 1) { // 九九（2, 3, 5の段）
        const tables = [2, 3, 5];
        num1 = tables[random(0, 2)];
        num2 = random(1, 9);
      } else if (grade <= 2) { // 九九（全ての段）
        num1 = random(2, 9);
        num2 = random(1, 9);
      } else if (grade === 3) { // 10の倍数 × 1桁
        num1 = getNiceNumber(10, 90);
        num2 = random(2, 9);
      } else if (grade === 4) { // 2桁 × 1桁（繰り上がりなし）
        num1 = random(11, 44);
        num2 = random(2, Math.floor(9 / Math.max(num1 % 10, 1)));
        if (num1 * num2 > 99) num2 = 2; // Safety
        // Better:
        const n1_1 = random(1, 4);
        const n1_0 = random(1, 4);
        num1 = n1_1 * 10 + n1_0;
        num2 = random(2, Math.min(Math.floor(9/n1_1), Math.floor(9/n1_0)));
      } else if (grade === 5) { // 2桁 × 1桁（ランダム）
        num1 = random(11, 99);
        num2 = random(2, 9);
      } else if (grade === 6) { // 3桁 × 1桁
        num1 = random(101, 999);
        num2 = random(2, 9);
      } else if (grade === 7) { // 10の倍数 × 10の倍数
        num1 = getNiceNumber(10, 90);
        num2 = getNiceNumber(10, 90);
      } else if (grade === 8) { // 2桁 × 2桁（ランダム）
        num1 = random(11, 99);
        num2 = random(11, 99);
      } else if (grade === 9) { // 3桁 × 2桁
        num1 = random(101, 999);
        num2 = random(11, 99);
      } else { // 3桁 × 3桁
        num1 = random(101, 999);
        num2 = random(101, 999);
      }
      answer = num1 * num2;
      break;

    case 'div':
      if (grade <= 3) { // 九九の逆（答えが1桁）
        num2 = random(2, 9);
        answer = random(2, 9);
        num1 = num2 * answer;
      } else if (grade === 4) { // 2桁 ÷ 1桁（商が10以上）
        num2 = random(2, 9);
        answer = random(10, 20);
        num1 = num2 * answer;
      } else if (grade === 5) { // 3桁 ÷ 1桁（商が100以上、キリが良い数）
        num2 = random(2, 9);
        answer = getNiceNumber(100, 300, 10);
        num1 = num2 * answer;
      } else if (grade === 6) { // 3桁 ÷ 1桁（ランダム）
        num2 = random(2, 9);
        answer = random(11, 99);
        num1 = num2 * answer;
      } else if (grade === 7) { // 2桁 ÷ 10の倍数
        num2 = getNiceNumber(10, 40);
        answer = random(2, 9);
        num1 = num2 * answer;
      } else if (grade === 8) { // 3桁 ÷ 10の倍数
        num2 = getNiceNumber(10, 90);
        answer = getNiceNumber(10, 20);
        num1 = num2 * answer;
      } else if (grade === 9) { // 3桁 ÷ 2桁
        num2 = random(11, 50);
        answer = random(2, 19);
        num1 = num2 * answer;
      } else { // 4桁 ÷ 2桁
        num2 = random(11, 99);
        answer = random(11, 99);
        num1 = num2 * answer;
      }
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
    <div className="h-screen w-screen flex items-center justify-center overflow-hidden bg-dirt select-none">
      <AnimatePresence mode="wait">
        {gameState === 'menu' && (
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
              <div className="mc-panel space-y-8">
                <h2 className="text-2xl md:text-4xl font-bold text-gray-300 text-center flex items-center justify-center gap-3">
                  レベルを選択
                </h2>
                <div className="grid grid-cols-5 gap-4">
                  {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as Grade[]).map((g) => (
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
                        "mc-button text-2xl h-20",
                        selectedGrade === g && "mc-button-green scale-105"
                      )}
                    >
                      Lv {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mc-panel space-y-8">
                <h2 className="text-2xl md:text-4xl font-bold text-gray-300 text-center">計算を選択</h2>
                <div className="flex flex-wrap justify-center gap-6">
                  {GRADE_OPERATIONS[selectedGrade].map((op) => (
                    <button
                      key={op}
                      onClick={() => {
                        playClickSound();
                        setSelectedOp(op);
                      }}
                      className={cn(
                        "mc-button text-3xl min-w-[200px] h-20",
                        selectedOp === op && "mc-button-blue scale-105"
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
              className="mc-button mc-button-orange text-6xl w-full max-w-2xl h-40 mt-12 flex items-center gap-6"
            >
              <Play fill="currentColor" className="w-16 h-16" />
              あそぶ！
            </button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div 
            key="playing"
            {...pageTransition}
            className="w-full h-full flex flex-col items-center justify-center p-4 bg-stone/60"
          >
            <div className="w-full max-w-5xl h-full flex flex-col items-center justify-between py-12">
              <div className="w-full flex justify-between items-center px-4">
                <div className="mc-panel py-2 px-6 bg-black/60">
                  <span className="text-xl md:text-2xl font-bold text-white">第 {currentIndex + 1} 問 / {TOTAL_QUESTIONS}</span>
                </div>
                <div className="mc-panel py-2 px-6 bg-black/60">
                  <span className="text-lg md:text-xl font-bold text-blue-300">Lv {selectedGrade} {OP_NAMES[selectedOp]}</span>
                </div>
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
                      <span>{questions[currentIndex].num1}</span>
                      <span className="text-yellow-400">{OP_SYMBOLS[questions[currentIndex].op]}</span>
                      <span>{questions[currentIndex].num2}</span>
                    </div>
                    
                    <div className="relative w-full max-w-lg mt-8">
                       <input
                        ref={inputRef}
                        type="number"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={feedback !== null}
                        className="w-full bg-[#1e1e1e] border-4 border-[#373737] px-8 py-6 text-6xl md:text-7xl font-bold text-center text-white focus:outline-none focus:border-green-500 shadow-[inset_4px_4px_0_rgba(0,0,0,0.8)]"
                        placeholder="?"
                      />
                      <AnimatePresence>
                        {showHint && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute -top-28 left-0 right-0 text-center z-20"
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
                <button
                  onClick={() => handleAnswer(false)}
                  disabled={inputValue.trim() === '' || feedback !== null}
                  className="mc-button mc-button-green text-4xl h-32 flex-1"
                >
                  こたえる
                </button>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleHint}
                    disabled={feedback !== null || showHint}
                    className="mc-button h-16 text-xl w-48"
                  >
                    ヒント
                  </button>
                  <button
                    onClick={() => handleAnswer(true)}
                    disabled={feedback !== null}
                    className="mc-button h-16 text-xl w-48"
                  >
                    パス
                  </button>
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
        )}

        {gameState === 'result' && (
          <motion.div 
            key="result"
            {...pageTransition}
            className="w-full h-full flex flex-col items-center justify-center p-6 bg-stone"
          >
            <div className="mc-panel w-full max-w-4xl max-h-[90vh] flex flex-col bg-stone p-8 border-8">
              <div className="text-center mb-12">
                <h2 className="mc-title text-4xl md:text-5xl mb-4 text-yellow-400">けっか発表！</h2>
                <div className="mc-panel inline-block px-12 py-4 bg-black/40 border-black mt-4">
                  <span className="text-3xl font-bold">
                    {TOTAL_QUESTIONS}問中 <span className="text-5xl text-yellow-400 mx-2">{answers.filter(a => a.isCorrect).length}</span> 問正解！
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 mb-8 pr-2">
                {answers.map((ans, i) => (
                  <div key={i} className={cn(
                    "mc-panel p-6 flex items-center justify-between border-4",
                    ans.isCorrect ? "border-green-500 bg-green-900/20" : "border-red-500 bg-red-900/20"
                  )}>
                    <div className="flex items-center gap-6">
                      <span className="text-gray-400 font-bold text-xl">Q{i + 1}</span>
                      <span className="text-3xl font-bold tracking-widest text-white">
                        {ans.num1} {OP_SYMBOLS[ans.op]} {ans.num2} = {ans.answer}
                      </span>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <span className="block text-xs text-gray-400 mb-1">あなたのこたえ</span>
                        <span className="text-2xl font-bold">{ans.userAnswer !== null ? ans.userAnswer : 'ー'}</span>
                      </div>
                      <div className="text-4xl">
                        {ans.isCorrect ? (
                          <span className="text-green-500">○</span>
                        ) : (
                          <span className="text-red-500">×</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 h-20">
                <button
                  onClick={startGame}
                  className="mc-button mc-button-green text-2xl flex items-center gap-3"
                >
                  <RotateCcw className="w-6 h-6" />
                  もういちど
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    setGameState('menu');
                  }}
                  className="mc-button mc-button-blue text-2xl flex items-center gap-3"
                >
                  <Home className="w-6 h-6" />
                  タイトル
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
