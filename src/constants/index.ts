import { Operation, Grade } from '../types';

export const OP_SYMBOLS: Record<Operation, string> = {
  add: '+',
  sub: '-',
  mul: '×',
  div: '÷',
};

export const OP_NAMES: Record<Operation, string> = {
  add: 'たしざん',
  sub: 'ひきざん',
  mul: 'かけざん',
  div: 'わりざん',
};

export const GRADE_OPERATIONS: Record<Grade, Operation[]> = {
  1: ['add', 'sub', 'mul', 'div'],
  2: ['add', 'sub', 'mul', 'div'],
  3: ['add', 'sub', 'mul', 'div'],
  4: ['add', 'sub', 'mul', 'div'],
  5: ['add', 'sub', 'mul', 'div'],
  6: ['add', 'sub', 'mul', 'div'],
  7: ['add', 'sub', 'mul', 'div'],
  8: ['add', 'sub', 'mul', 'div'],
  9: ['add', 'sub', 'mul', 'div'],
  10: ['add', 'sub', 'mul', 'div'],
};

export const TOTAL_QUESTIONS = 4;

export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};
