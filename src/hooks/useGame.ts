import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Grade, Operation, Question, AnsweredQuestion } from '../types';
import { TOTAL_QUESTIONS } from '../constants';
import { generateQuestion } from '../lib/gameLogic';
import { playClickSound, playCorrectSound, playIncorrectSound } from '../lib/audio';

export const useGame = () => {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [selectedGrade, setSelectedGrade] = useState<Grade>(1);
  const [selectedOp, setSelectedOp] = useState<Operation>('add');
  
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

  const startGame = useCallback(() => {
    playClickSound();
    const newQuestions = Array.from({ length: TOTAL_QUESTIONS }, () => generateQuestion(selectedGrade, selectedOp));
    setQuestions(newQuestions);
    setAnswers([]);
    setCurrentIndex(0);
    setFeedback(null);
    setGameState('playing');
  }, [selectedGrade, selectedOp]);

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
    handleHint,
    startGame,
    handleAnswer,
    backToMenu,
  };
};

