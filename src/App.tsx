import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useGame } from './hooks/useGame';
import { MenuScreen } from './components/MenuScreen';
import { PlayingScreen } from './components/PlayingScreen';
import { ResultScreen } from './components/ResultScreen';
import { OptionsDialog } from './components/OptionsDialog';
import { Button } from './components/ui/Button';
import { FitStage } from './components/ui/FitStage';
import { FxCanvas, FxHandle } from './components/hype/FxCanvas';
import { HypeMenuScreen } from './components/hype/HypeMenuScreen';
import { HypePlayingScreen, HypeSummary } from './components/hype/HypePlayingScreen';
import { HypeResultScreen } from './components/hype/HypeResultScreen';
import { Settings } from './types';
import { loadSave, mutateSave } from './lib/storage';
import { INTENSITY, RULES } from './lib/hype/rules';
import { hypeAudio } from './lib/hype/audio';
import { playClickSound } from './lib/audio';

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSave().settings);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const hype = settings.effectMode === 'hype';
  /** チャレンジ（時間内に何問）はマシマシモードだけ */
  const challenge = hype && settings.playMode === 'challenge';
  /** マシマシの大きなカットイン中は、次の問題へ進むのを待つ（HypePlayingScreen が中身を入れる） */
  const holdRef = useRef<(() => boolean) | null>(null);

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
    endGame,
  } = useGame(
    hype
      ? {
          questionCount: challenge ? RULES.challenge.poolSize : settings.questionCount,
          feedbackMs: challenge ? RULES.challenge.feedbackMs : RULES.timing.feedbackMs,
          builtinSfx: false,
          holdAdvance: () => holdRef.current?.() ?? false,
        }
      : {},
  );

  const fxRef = useRef<FxHandle>(null);
  const summaryRef = useRef<HypeSummary | null>(null);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const next = mutateSave((d) => Object.assign(d.settings, patch)).settings;
    setSettings(next);
  }, []);

  // ブラウザは操作のあとでないと音を出せないので、最初の操作で音を準備する
  useEffect(() => {
    const unlock = () => hypeAudio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    hypeAudio.setBgmEnabled(hype && settings.bgm);
    if (!hype) hypeAudio.playBgm(null);
    fxRef.current?.setIntensity(INTENSITY[settings.intensity]);
  }, [hype, settings.bgm, settings.intensity]);

  const openOptions = (e: React.MouseEvent) => {
    if (hype) {
      hypeAudio.select();
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      fxRef.current?.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 12, speed: 5 });
    } else {
      playClickSound();
    }
    setOptionsOpen(true);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center overflow-hidden bg-dirt select-none relative">
      {/* 画面が小さいときは中身をまるごと縮める（背景と演出レイヤーは外） */}
      <FitStage>
        <AnimatePresence mode="wait">
          {gameState === 'menu' && !hype && (
            <MenuScreen
              selectedGrade={selectedGrade}
              setSelectedGrade={setSelectedGrade}
              selectedOp={selectedOp}
              setSelectedOp={setSelectedOp}
              startGame={() => startGame(false)}
            />
          )}
          {gameState === 'menu' && hype && (
            <HypeMenuScreen
              key="hype-menu"
              selectedGrade={selectedGrade}
              setSelectedGrade={setSelectedGrade}
              selectedOp={selectedOp}
              setSelectedOp={setSelectedOp}
              questionCount={settings.questionCount}
              setQuestionCount={(n) => updateSettings({ questionCount: n })}
              playMode={settings.playMode}
              setPlayMode={(m) => updateSettings({ playMode: m })}
              challengeMinutes={settings.challengeMinutes}
              setChallengeMinutes={(m) => updateSettings({ challengeMinutes: m })}
              startGame={startGame}
              fx={fxRef}
            />
          )}

          {gameState === 'playing' && !hype && (
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
          {gameState === 'playing' && hype && (
            <HypePlayingScreen
              key="hype-playing"
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
              endGame={endGame}
              playMode={challenge ? 'challenge' : 'practice'}
              challengeMinutes={settings.challengeMinutes}
              intensity={settings.intensity}
              fx={fxRef}
              summaryRef={summaryRef}
              holdRef={holdRef}
            />
          )}

          {gameState === 'result' && !hype && (
            <ResultScreen answers={answers} startGame={startGame} backToMenu={backToMenu} />
          )}
          {gameState === 'result' && hype && (
            <HypeResultScreen
              key="hype-result"
              answers={answers}
              summary={summaryRef.current}
              grade={selectedGrade}
              op={selectedOp}
              intensity={settings.intensity}
              fx={fxRef}
              startGame={startGame}
              backToMenu={backToMenu}
            />
          )}
        </AnimatePresence>

        {gameState === 'menu' && (
          <Button onClick={openOptions} className="!absolute top-4 right-4 w-14 h-14 !p-0 z-[100]" aria-label="オプション">
            <SettingsIcon className="w-7 h-7" />
          </Button>
        )}

        <AnimatePresence>
          {optionsOpen && (
            <OptionsDialog settings={settings} onChange={updateSettings} onClose={() => setOptionsOpen(false)} />
          )}
        </AnimatePresence>
      </FitStage>

      {/* 演出レイヤー（マシマシモードだけ。クリックは下に通す） */}
      {hype && <FxCanvas ref={fxRef} />}
    </div>
  );
}
