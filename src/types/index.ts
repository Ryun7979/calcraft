export type Grade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type Operation = 'add' | 'sub' | 'mul' | 'div' | 'remix';
export type GameState = 'menu' | 'playing' | 'result';

export interface Question {
  num1: number;
  num2: number;
  op: Operation;
  answer: number;
  remainder?: number;
}

export interface AnsweredQuestion extends Question {
  userAnswer: number | null;
  userRemainder?: number | null;
  isCorrect: boolean;
}

// --- 演出モード ---
export type EffectMode = 'calm' | 'hype';
export type EffectIntensity = 'low' | 'normal' | 'max';
export type QuestionCount = 4 | 10 | 20;
/** れんしゅう（問題数を決める）／チャレンジ（時間内に何問とけるか） */
export type PlayMode = 'practice' | 'challenge';
export type ChallengeMinutes = 1 | 2 | 3;

export interface Settings {
  effectMode: EffectMode;
  intensity: EffectIntensity;
  bgm: boolean;
  questionCount: QuestionCount;
  playMode: PlayMode;
  challengeMinutes: ChallengeMinutes;
}
