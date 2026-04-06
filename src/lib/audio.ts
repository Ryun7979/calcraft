import correctSound from '../assets/sound/correct.mp3';
import incorrectSound from '../assets/sound/Incorrect.mp3';
import clickSound from '../assets/sound/pic.mp3';

let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

const playAudioFile = (url: string) => {
  const audio = new Audio(url);
  audio.play().catch(e => {
    console.error('Audio playback failed', e);
  });
};

export const playClickSound = () => {
  playAudioFile(clickSound);
};

export const playCorrectSound = () => {
  playAudioFile(correctSound);
};

export const playIncorrectSound = () => {
  playAudioFile(incorrectSound);
};
