import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Grade, Operation, Question, AnsweredQuestion } from '../types';
import { TOTAL_QUESTIONS } from '../constants';
import { generateQuestion } from '../lib/gameLogic';
import { playClickSound, playCorrectSound, playIncorrectSound } from '../lib/audio';

export interface UseGameOptions {
  /** 1回の問題数（省略時は TOTAL_QUESTIONS）。startGame の時点の値を使う */
  questionCount?: number;
  /** 正解・不正解を見せてから次の問題に進むまでの ms（省略時は 1010） */
  feedbackMs?: number;
  /** false にすると、ここで鳴らしている効果音（mp3）を鳴らさない。マシマシモードは自前の音を使う */
  builtinSfx?: boolean;
  /** true を返すあいだ、次の問題（または結果画面）へ進まずに待つ。大きなカットインの最中に使う */
  holdAdvance?: () => boolean;
}

export const useGame = (options: UseGameOptions = {}) => {
  const optsRef = useRef(options);
  optsRef.current = options;
  const sfx = (play: () => void) => {
    if (optsRef.current.builtinSfx !== false) play();
  };

  const [gameState, setGameState] = useState<GameState>('menu');
  const [selectedGrade, setSelectedGrade] = useState<Grade>(1);
  const [selectedOp, setSelectedOp] = useState<Operation>('add');
  
  // 連続成績トラッキング用
  const [consecutiveFullMarks, setConsecutiveFullMarks] = useState(0);
  const [consecutiveLowScore, setConsecutiveLowScore] = useState(0);
  const [hasLeveledUp, setHasLeveledUp] = useState(false);
  const [levelChange, setLevelChange] = useState<'up' | 'down' | null>(null);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnsweredQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setShowHint(false);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
  }, [currentIndex]);

  const handleHint = useCallback(() => {
    if (feedback !== null || showHint) return;
    sfx(playClickSound);
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
  }, [currentIndex, feedback, questions, showHint]);

  const startGame = useCallback((isRetry = false) => {
    sfx(playClickSound);
    const count = optsRef.current.questionCount ?? TOTAL_QUESTIONS;
    
    let nextGrade = selectedGrade;
    let change: 'up' | 'down' | null = null;

    if (isRetry && answers.length > 0 && answers.length === questions.length) {
      const correctCount = answers.filter(a => a.isCorrect).length;
      const isFullMarks = correctCount === answers.length;
      const isLowScore = correctCount <= Math.floor(answers.length / 2); // 50%以下

      if (isFullMarks) {
        const nextCount = consecutiveFullMarks + 1;
        if (nextCount >= 2 && selectedGrade < 10) {
          nextGrade = (selectedGrade + 1) as Grade;
          change = 'up';
          setConsecutiveFullMarks(0);
          setHasLeveledUp(true);
        } else {
          setConsecutiveFullMarks(nextCount);
        }
        setConsecutiveLowScore(0);
      } else if (isLowScore) {
        const nextCount = consecutiveLowScore + 1;
        // 一度でもレベルアップが発生した後の条件
        if (nextCount >= 2 && selectedGrade > 1 && hasLeveledUp) {
          nextGrade = (selectedGrade - 1) as Grade;
          change = 'down';
          setConsecutiveLowScore(0);
        } else {
          setConsecutiveLowScore(nextCount);
        }
        setConsecutiveFullMarks(0);
      } else {
        // 条件外ならリセット
        setConsecutiveFullMarks(0);
        setConsecutiveLowScore(0);
      }
    } else if (!isRetry) {
      // メニューから開始、またはリトライ以外ではリセット
      setConsecutiveFullMarks(0);
      setConsecutiveLowScore(0);
      setHasLeveledUp(false);
    }

    setSelectedGrade(nextGrade);
    setLevelChange(change);
    if (change) {
      // 演出用。PlayingScreenで表示され終わる頃にリセット
      setTimeout(() => setLevelChange(null), 3000);
    }

    const newQuestions = Array.from({ length: count }, () => generateQuestion(nextGrade, selectedOp));
    setQuestions(newQuestions);
    setAnswers([]);
    setCurrentIndex(0);
    setFeedback(null);
    setGameState('playing');
  }, [selectedGrade, selectedOp, answers, questions.length, consecutiveFullMarks, consecutiveLowScore, hasLeveledUp]);

  const handleAnswer = useCallback((value: string, remainderValue: string = '', skipped: boolean = false) => {
    if (feedback !== null) return;

    const currentQ = questions[currentIndex];
    const parsedInput = parseInt(value, 10);
    const parsedRemainder = parseInt(remainderValue, 10);
    
    const isRemainderRequired = currentQ.op === 'div' && currentQ.remainder !== undefined;
    
    let isCorrect = !skipped && !isNaN(parsedInput) && parsedInput === currentQ.answer;
    if (isCorrect && isRemainderRequired) {
      isCorrect = !isNaN(parsedRemainder) && parsedRemainder === currentQ.remainder;
    }

    sfx(isCorrect ? playCorrectSound : playIncorrectSound);

    setFeedback(isCorrect ? 'correct' : 'incorrect');

    const answeredQ: AnsweredQuestion = {
      ...currentQ,
      userAnswer: skipped || isNaN(parsedInput) ? null : parsedInput,
      userRemainder: isRemainderRequired ? (skipped || isNaN(parsedRemainder) ? null : parsedRemainder) : undefined,
      isCorrect,
    };

    const advance = () => {
      if (optsRef.current.holdAdvance?.()) {
        setTimeout(advance, 100);
        return;
      }
      setAnswers((prev) => [...prev, answeredQ]);
      setFeedback(null);
      
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setGameState('result');
      }
    };
    setTimeout(advance, optsRef.current.feedbackMs ?? 1010); // 微調整
  }, [currentIndex, feedback, questions]);

  /** 時間切れなどで、のこりの問題をとばして結果画面へ（チャレンジモード用） */
  const endGame = useCallback(() => {
    setFeedback(null);
    setGameState('result');
  }, []);

  const backToMenu = useCallback(() => {
    sfx(playClickSound);
    setGameState('menu');
  }, []);

  return {
    gameState,
    selectedGrade,
    setSelectedGrade,
    selectedOp,
    setSelectedOp,
    questions,
    answers,
    currentIndex,
    feedback,
    showHint,
    hintText,
    levelChange,
    handleHint,
    startGame,
    handleAnswer,
    backToMenu,
    endGame,
  };
};

