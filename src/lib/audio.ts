import correctSound from '../assets/sound/correct.mp3';
import incorrectSound from '../assets/sound/Incorrect.mp3';
import clickSound from '../assets/sound/pic.mp3';

// Pre-load audio files
const sounds: Record<string, HTMLAudioElement> = {
  correct: new Audio(correctSound),
  incorrect: new Audio(incorrectSound),
  click: new Audio(clickSound),
};

const playSound = (name: string) => {
  const audio = sounds[name];
  if (!audio) return;
  
  // Reset playback if sound is already playing
  audio.currentTime = 0;
  audio.play().catch(e => {
    console.error(`Audio playback failed for ${name}`, e);
  });
};

export const playClickSound = () => {
  playSound('click');
};

export const playCorrectSound = () => {
  playSound('correct');
};

export const playIncorrectSound = () => {
  playSound('incorrect');
};

