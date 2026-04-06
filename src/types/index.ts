export type Grade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type Operation = 'add' | 'sub' | 'mul' | 'div';
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
