import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Grade, Operation, Question, AnsweredQuestion } from '../types';
import { TOTAL_QUESTIONS } from '../constants';
import { generateQuestion } from '../lib/gameLogic';
import { playClickSound, playCorrectSound, playIncorrectSound } from '../lib/audio';

export const useGame = () => {
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
  }, [currentIndex, feedback, questions, showHint]);

  const startGame = useCallback((isRetry = false) => {
    playClickSound();
    
    let nextGrade = selectedGrade;
    let change: 'up' | 'down' | null = null;

    if (isRetry && answers.length === TOTAL_QUESTIONS) {
      const correctCount = answers.filter(a => a.isCorrect).length;
      const isFullMarks = correctCount === TOTAL_QUESTIONS;
      const isLowScore = correctCount <= Math.floor(TOTAL_QUESTIONS / 2); // 50%以下

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

    const newQuestions = Array.from({ length: TOTAL_QUESTIONS }, () => generateQuestion(nextGrade, selectedOp));
    setQuestions(newQuestions);
    setAnswers([]);
    setCurrentIndex(0);
    setFeedback(null);
    setGameState('playing');
  }, [selectedGrade, selectedOp, answers, consecutiveFullMarks, consecutiveLowScore, hasLeveledUp]);

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

    if (isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }

    setFeedback(isCorrect ? 'correct' : 'incorrect');

    const answeredQ: AnsweredQuestion = {
      ...currentQ,
      userAnswer: skipped || isNaN(parsedInput) ? null : parsedInput,
      userRemainder: isRemainderRequired ? (skipped || isNaN(parsedRemainder) ? null : parsedRemainder) : undefined,
      isCorrect,
    };

    setTimeout(() => {
      setAnswers((prev) => [...prev, answeredQ]);
      setFeedback(null);
      
      if (currentIndex + 1 < TOTAL_QUESTIONS) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setGameState('result');
      }
    }, 1010); // 微調整
  }, [currentIndex, feedback, questions]);

  const backToMenu = useCallback(() => {
    playClickSound();
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
  };
};

