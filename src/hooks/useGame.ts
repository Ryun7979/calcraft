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
  const [inputValue, setInputValue] = useState('');
  const [remainderInputValue, setRemainderInputValue] = useState('');
  
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const remainderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShowHint(false);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
  }, [currentIndex]);

  useEffect(() => {
    if (gameState === 'playing' && feedback === null) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [gameState, currentIndex, feedback]);

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

    // ヒントボタンクリック後にフォーカスを戻す
    inputRef.current?.focus();
  }, [currentIndex, feedback, questions, showHint]);

  const startGame = useCallback(() => {
    playClickSound();
    const newQuestions = Array.from({ length: TOTAL_QUESTIONS }, () => generateQuestion(selectedGrade, selectedOp));
    setQuestions(newQuestions);
    setAnswers([]);
    setCurrentIndex(0);
    setInputValue('');
    setRemainderInputValue('');
    setFeedback(null);
    setGameState('playing');
    
    // ゲーム開始直後にフォーカス
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [selectedGrade, selectedOp]);

  const handleAnswer = useCallback((skipped: boolean = false) => {
    if (feedback !== null) return;

    const currentQ = questions[currentIndex];
    const parsedInput = parseInt(inputValue, 10);
    const parsedRemainder = parseInt(remainderInputValue, 10);
    
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
      setInputValue('');
      setRemainderInputValue('');
      
      if (currentIndex + 1 < TOTAL_QUESTIONS) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setGameState('result');
      }
    }, 1000);
  }, [currentIndex, feedback, inputValue, remainderInputValue, questions]);

  const backToMenu = useCallback(() => {
    playClickSound();
    setGameState('menu');
  }, []);

  return {
    gameState,
    setGameState,
    selectedGrade,
    setSelectedGrade,
    selectedOp,
    setSelectedOp,
    questions,
    answers,
    currentIndex,
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
    startGame,
    handleAnswer,
    backToMenu,
  };
};
