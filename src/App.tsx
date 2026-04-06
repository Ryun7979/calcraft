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
    feedback,
    showHint,
    hintText,
    levelChange,
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
            feedback={feedback}
            showHint={showHint}
            hintText={hintText}
            levelChange={levelChange}
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

