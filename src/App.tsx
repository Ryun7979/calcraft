import React from 'react';
import { AnimatePresence } from 'motion/react';
import { useGame } from './hooks/useGame';
import { MenuScreen } from './components/MenuScreen';
import { PlayingScreen } from './components/PlayingScreen';
import { ResultScreen } from './components/ResultScreen';

export default function App() {
  const {
    gameState,
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
  } = useGame();

  return (
    <div className="h-screen w-screen flex items-center justify-center overflow-hidden bg-dirt select-none">
      <AnimatePresence mode="wait">
        {gameState === 'menu' && (
          <MenuScreen
            selectedGrade={selectedGrade}
            setSelectedGrade={setSelectedGrade}
            selectedOp={selectedOp}
            setSelectedOp={setSelectedOp}
            startGame={startGame}
          />
        )}

        {gameState === 'playing' && (
          <PlayingScreen
            currentIndex={currentIndex}
            selectedGrade={selectedGrade}
            selectedOp={selectedOp}
            questions={questions}
            inputValue={inputValue}
            setInputValue={setInputValue}
            remainderInputValue={remainderInputValue}
            setRemainderInputValue={setRemainderInputValue}
            feedback={feedback}
            showHint={showHint}
            hintText={hintText}
            inputRef={inputRef}
            remainderInputRef={remainderInputRef}
            handleHint={handleHint}
            handleAnswer={handleAnswer}
          />
        )}

        {gameState === 'result' && (
          <ResultScreen
            answers={answers}
            startGame={startGame}
            backToMenu={backToMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
