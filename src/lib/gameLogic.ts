import { Grade, Operation, Question } from '../types';

export const generateQuestion = (grade: Grade, op: Operation): Question => {
  let num1 = 0, num2 = 0, answer = 0;
  const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  const getNiceNumber = (min: number, max: number, factor: number = 10) => {
    const minFactor = Math.ceil(min / factor);
    const maxFactor = Math.floor(max / factor);
    return random(minFactor, maxFactor) * factor;
  };

  switch (op) {
    case 'add':
      if (grade === 1) { // 1桁＋1桁（和が10以下）
        num1 = random(1, 9);
        num2 = random(1, 10 - num1);
      } else if (grade === 2) { // 1桁＋1桁（繰り上がりあり）
        num1 = random(2, 9);
        num2 = random(11 - num1, 9);
      } else if (grade === 3) { // 2桁＋1桁（繰り上がりなし）
        num1 = random(10, 89);
        num2 = random(1, 9 - (num1 % 10));
      } else if (grade === 4) { // 2桁＋1桁（繰り上がりあり）
        num1 = random(11, 89);
        num2 = random(10 - (num1 % 10), 9);
      } else if (grade === 5) { // 2桁＋2桁（10の倍数）
        num1 = getNiceNumber(10, 80);
        num2 = getNiceNumber(10, 90 - num1);
      } else if (grade === 6) { // 2桁＋2桁（ゾロ目）
        const d1 = random(1, 4);
        const d2 = random(1, 9 - d1);
        num1 = d1 * 11;
        num2 = d2 * 11;
      } else if (grade === 7) { // 2桁＋2桁（全桁繰り上がりなし）
        const n1_1 = random(1, 8);
        const n1_0 = random(0, 8);
        const n2_1 = random(1, 9 - n1_1);
        const n2_0 = random(1, 9 - n1_0);
        num1 = n1_1 * 10 + n1_0;
        num2 = n2_1 * 10 + n2_0;
      } else if (grade === 8) { // 2桁＋2桁（ランダム）
        num1 = random(11, 89);
        num2 = random(11, 99 - num1);
      } else if (grade === 9) { // 3桁＋2桁（一方がキリの良い数）
        num1 = Math.random() < 0.5 ? getNiceNumber(100, 900, 100) : random(100, 999);
        num2 = num1 >= 1000 ? random(10, 99) : (num1 % 100 === 0 ? random(10, 99) : getNiceNumber(10, 90));
      } else { // 3桁＋3桁
        num1 = random(100, 999);
        num2 = random(100, 999);
      }
      answer = num1 + num2;
      break;

    case 'sub':
      if (grade === 1) { // 1桁－1桁（繰り下がりなし）
        num1 = random(2, 9);
        num2 = random(1, num1);
      } else if (grade === 2) { // 10代－1桁（繰り下がりあり）
        num2 = random(2, 9);
        num1 = random(11, 18);
        num2 = random((num1 % 10) + 1, 9);
      } else if (grade === 3) { // 2桁－1桁（繰り下がりなし）
        num1 = random(11, 99);
        num2 = random(1, num1 % 10 || 1);
      } else if (grade === 4) { // 2桁－1桁（繰り下がりあり）
        num1 = random(21, 98);
        num2 = random((num1 % 10) + 1, 9);
      } else if (grade === 5) { // 2桁－2桁（10の倍数）
        num1 = getNiceNumber(20, 90);
        num2 = getNiceNumber(10, num1 - 10);
      } else if (grade === 6) { // 2桁－2桁（ゾロ目）
        num2 = random(1, 4) * 11;
        num1 = random(num2 / 11 + 1, 9) * 11;
      } else if (grade === 7) { // 2桁－2桁（繰り下がりなし）
        const n1_1 = random(2, 9);
        const n1_0 = random(1, 9);
        const n2_1 = random(1, n1_1 - 1);
        const n2_0 = random(1, n1_0);
        num1 = n1_1 * 10 + n1_0;
        num2 = n2_1 * 10 + n2_0;
      } else if (grade === 8) { // 2桁－2桁（ランダム）
        num1 = random(21, 99);
        num2 = random(11, num1 - 1);
      } else if (grade === 9) { // 3桁－2桁（一方がキリの良い数）
        num1 = getNiceNumber(200, 900, 100);
        num2 = random(11, 99);
      } else { // 3桁－3桁
        num1 = random(200, 999);
        num2 = random(100, num1 - 1);
      }
      answer = num1 - num2;
      break;

    case 'mul':
      if (grade <= 1) { // 九九（2, 3, 5の段）
        const tables = [2, 3, 5];
        num1 = tables[random(0, 2)];
        num2 = random(1, 9);
      } else if (grade <= 2) { // 九九（全ての段）
        num1 = random(2, 9);
        num2 = random(1, 9);
      } else if (grade === 3) { // 10の倍数 × 1桁
        num1 = getNiceNumber(10, 90);
        num2 = random(2, 9);
      } else if (grade === 4) { // 2桁 × 1桁（繰り上がりなし）
        const n1_1 = random(1, 4);
        const n1_0 = random(1, 4);
        num1 = n1_1 * 10 + n1_0;
        num2 = random(2, Math.min(Math.floor(9/n1_1), Math.floor(9/n1_0)));
      } else if (grade === 5) { // 2桁 × 1桁（ランダム）
        num1 = random(11, 99);
        num2 = random(2, 9);
      } else if (grade === 6) { // 3桁 × 1桁
        num1 = random(101, 999);
        num2 = random(2, 9);
      } else if (grade === 7) { // 10の倍数 × 10の倍数
        num1 = getNiceNumber(10, 90);
        num2 = getNiceNumber(10, 90);
      } else if (grade === 8) { // 2桁 × 2桁（ランダム）
        num1 = random(11, 99);
        num2 = random(11, 99);
      } else if (grade === 9) { // 3桁 × 2桁
        num1 = random(101, 999);
        num2 = random(11, 99);
      } else { // 3桁 × 3桁
        num1 = random(101, 999);
        num2 = random(101, 999);
      }
      answer = num1 * num2;
      break;

    case 'div': {
      let remainder = 0;
      if (grade <= 3) { // 九九の逆（答えが1桁）
        num2 = random(2, 9);
        answer = random(2, 9);
        num1 = num2 * answer;
      } else if (grade === 4) { // 2桁 ÷ 1桁（商が10以上）
        num2 = random(2, 9);
        answer = random(10, 20);
        num1 = num2 * answer + random(0, num2 - 1);
      } else if (grade === 5) { // 3桁 ÷ 1桁（商が100以上、キリが良い数）
        num2 = random(2, 9);
        answer = getNiceNumber(100, 300, 10);
        num1 = num2 * answer + random(0, num2 - 1);
      } else if (grade === 6) { // 3桁 ÷ 1桁（ランダム）
        num2 = random(2, 9);
        answer = random(11, 99);
        num1 = num2 * answer + random(0, num2 - 1);
      } else if (grade === 7) { // 2桁 ÷ 10の倍数
        num2 = getNiceNumber(10, 40);
        answer = random(2, 9);
        num1 = num2 * answer + random(0, num2 - 1);
      } else if (grade === 8) { // 3桁 ÷ 10の倍数
        num2 = getNiceNumber(10, 90);
        answer = getNiceNumber(10, 20);
        num1 = num2 * answer + random(0, num2 - 1);
      } else if (grade === 9) { // 3桁 ÷ 2桁
        num2 = random(11, 50);
        answer = random(2, 19);
        num1 = num2 * answer + random(0, num2 - 1);
      } else { // 4桁 ÷ 2桁
        num2 = random(11, 99);
        answer = random(11, 99);
        num1 = num2 * answer + random(0, num2 - 1);
      }
      
      const realAnswer = Math.floor(num1 / num2);
      const realRemainder = num1 % num2;
      return { num1, num2, op, answer: realAnswer, remainder: realRemainder };
    }

    case 'remix': {
      const remixConfigs: Record<number, { ops: Operation[], subGrades: Record<string, number[]> }> = {
        1: { ops: ['add', 'sub'], subGrades: { add: [1], sub: [1] } },
        2: { ops: ['add', 'sub'], subGrades: { add: [1, 2], sub: [1, 2] } },
        3: { ops: ['add', 'sub', 'mul'], subGrades: { add: [3, 4], sub: [3, 4], mul: [1, 2] } },
        4: { ops: ['add', 'sub', 'mul', 'div'], subGrades: { add: [5, 6], sub: [5, 6], mul: [3, 4], div: [1, 2] } },
        5: { ops: ['add', 'sub', 'mul', 'div'], subGrades: { add: [7, 8], sub: [7, 8], mul: [5, 6], div: [3, 4] } },
        6: { ops: ['add', 'sub', 'mul', 'div'], subGrades: { add: [9, 10], sub: [9, 10], mul: [7, 8], div: [5, 6] } },
        7: { ops: ['add', 'sub', 'mul', 'div'], subGrades: { add: [10], sub: [10], mul: [9, 10], div: [7, 8] } },
        8: { ops: ['add', 'sub', 'mul', 'div'], subGrades: { add: [10], sub: [10], mul: [10], div: [9] } },
        9: { ops: ['add', 'sub', 'mul', 'div'], subGrades: { add: [10], sub: [10], mul: [10], div: [10] } },
        10: { ops: ['add', 'sub', 'mul', 'div'], subGrades: { add: [10], sub: [10], mul: [10], div: [10] } },
      };

      const config = remixConfigs[grade as number] || remixConfigs[1];
      const pickedOp = config.ops[random(0, config.ops.length - 1)];
      const possibleSubGrades = config.subGrades[pickedOp];
      const pickedSubGrade = possibleSubGrades[random(0, possibleSubGrades.length - 1)];
      
      return generateQuestion(pickedSubGrade as Grade, pickedOp);
    }
  }
  return { num1, num2, op, answer };
};
