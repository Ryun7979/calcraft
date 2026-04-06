import { Grade, Operation } from '../types';

export interface DifficultyInfo {
  tendency: string;
  grade: string;
}

export type DifficultyMapping = Record<Operation, Record<Grade, DifficultyInfo>>;

export const DIFFICULTY_INFO: DifficultyMapping = {
  add: {
    1: { tendency: '1桁＋1桁（合計10まで）', grade: '小1' },
    2: { tendency: '1桁＋1桁（くり上がりあり）', grade: '小1' },
    3: { tendency: '2桁＋1桁（くり上がりなし）', grade: '小2' },
    4: { tendency: '2桁＋1桁（くり上がりあり）', grade: '小2' },
    5: { tendency: '2桁＋2桁（10の倍数）', grade: '小2' },
    6: { tendency: '2桁＋2桁（ゾロ目）', grade: '小2' },
    7: { tendency: '2桁＋2桁（くり上がりなし）', grade: '小2' },
    8: { tendency: '2桁＋2桁（ランダム）', grade: '小2' },
    9: { tendency: '3桁＋2桁', grade: '小3' },
    10: { tendency: '3桁＋3桁', grade: '小3' },
  },
  sub: {
    1: { tendency: '1桁－1桁（くり下がりなし）', grade: '小1' },
    2: { tendency: '10代－1桁（くり下がりあり）', grade: '小1' },
    3: { tendency: '2桁－1桁（くり下がりなし）', grade: '小2' },
    4: { tendency: '2桁－1桁（くり下がりあり）', grade: '小2' },
    5: { tendency: '2桁－2桁（10の倍数）', grade: '小2' },
    6: { tendency: '2桁－2桁（ゾロ目）', grade: '小2' },
    7: { tendency: '2桁－2桁（くり下がりなし）', grade: '小2' },
    8: { tendency: '2桁－2桁（ランダム）', grade: '小2' },
    9: { tendency: '3桁－2桁', grade: '小3' },
    10: { tendency: '3桁－3桁', grade: '小3' },
  },
  mul: {
    1: { tendency: '九九（2, 3, 5のだん）', grade: '小2' },
    2: { tendency: '九九（すべてのだん）', grade: '小2' },
    3: { tendency: '（何十）×（1桁）', grade: '小3' },
    4: { tendency: '2桁×1桁（くり上がりなし）', grade: '小3' },
    5: { tendency: '2桁×1桁', grade: '小3' },
    6: { tendency: '3桁×1桁', grade: '小3' },
    7: { tendency: '（10の倍数）×（10の倍数）', grade: '小4' },
    8: { tendency: '2桁×2桁', grade: '小4' },
    9: { tendency: '3桁×2桁', grade: '小4' },
    10: { tendency: '3桁×3桁', grade: '小4〜5' },
  },
  div: {
    1: { tendency: '九九のぎゃく（あまりなし）', grade: '小3' },
    2: { tendency: '九九のぎゃく（あまりなし）', grade: '小3' },
    3: { tendency: '九九のぎゃく（あまりなし）', grade: '小3' },
    4: { tendency: '2桁÷1桁（商が2桁、あまりあり）', grade: '小4' },
    5: { tendency: '3桁÷1桁（キリの良い数、あまりあり）', grade: '小4' },
    6: { tendency: '3桁÷1桁（あまりあり）', grade: '小4' },
    7: { tendency: '2桁÷10の倍数（あまりあり）', grade: '小4' },
    8: { tendency: '3桁÷10の倍数（あまりあり）', grade: '小4' },
    9: { tendency: '3桁÷2桁（あまりあり）', grade: '小4' },
    10: { tendency: '4桁÷2桁（あまりあり）', grade: '小5' },
  },
};
