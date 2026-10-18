// マシマシモードのキャラクター（四角いドット）。React にもブラウザにも依存しない（docs/character/preview.html からも使う）。
//   ブロッくん（boy）  : 草ブロックの頭の男の子。誇張する部位は「腕」（ビヨーンと伸びるパンチ）
//   ブロッちゃん（girl）: さくらブロックの頭の女の子。ツインテールがゆれる。星のビーム
//   ゾンビ（zombie）    : こわくない、ちょっとまぬけなゾンビ。やっつけられる役
//
// 座標は「マス」単位。原点 (0,0) は足もとの中央、y はマイナスが上。
//   足: 3×4 マス ×2 / 胴: 8×6 マス / 頭: 12×12 マス / 腕: 2マス幅、長さ可変
// renderCharacter(skin, pose) が SVG の中身（文字列）を返し、アニメは「時間 t（秒）→ pose」の関数で書く。

export type CharacterId = 'boy' | 'girl' | 'zombie';
export type EyeKind = 'normal' | 'big' | 'happy' | 'star' | 'x' | 'closed' | 'zombie';
export type MouthKind = 'smile' | 'open' | 'bigopen' | 'o' | 'flat' | 'wavy' | 'grin';

export interface ArmPose {
  /** 0 = 下にたらす、90 = 横、180 = 真上（外側に開く向きが正） */
  angle: number;
  /** 長さ（マス）。ふだん 5。パンチでは数十マスまで伸びる */
  len: number;
}

export interface CharPose {
  x: number;
  y: number;
  /** 傾き（度、足もと中心） */
  tilt: number;
  /** 縦の伸び縮み。1 = ふつう、<1 でつぶれる（横は 1/squash で体積を保つ） */
  squash: number;
  headBob: number;
  eyes: EyeKind;
  mouth: MouthKind;
  blush: boolean;
  armL: ArmPose;
  armR: ArmPose;
  /** 足の伸び。1 = 4マス。伸びた分だけ体が持ち上がる */
  legL: number;
  legR: number;
  /** オーラの強さ 0〜3 */
  aura: number;
  /** ゆらぎ用の時間（秒） */
  t: number;
}

export const neutralPose = (): CharPose => ({
  x: 0,
  y: 0,
  tilt: 0,
  squash: 1,
  headBob: 0,
  eyes: 'normal',
  mouth: 'smile',
  blush: false,
  armL: { angle: 12, len: 5 },
  armR: { angle: 12, len: 5 },
  legL: 1,
  legR: 1,
  aura: 0,
  t: 0,
});

// --- 共通の色 ---
const C = {
  outline: '#1d1209',
  black: '#141414',
  white: '#ffffff',
  yellow: '#ffe14d',
  red: '#e84a4a',
  pink: '#ff8fb1',
  zEye: '#3a0d0d',
};

interface Skin {
  /** 頭の模様（12×12）。文字は palette で色にする */
  head: string[];
  palette: Record<string, string>;
  shirt: string;
  shirtDark: string;
  skin: string;
  skinDark: string;
  pants: string;
  shoe: string;
  /** 胴の模様（ボタン・ハートなど）を足す */
  chest?: (bodyTop: number) => string;
  /** 胴の下にスカートを付ける */
  skirt?: string;
  /** 頭のうしろに描くもの（ツインテール） */
  back?: (p: CharPose, headTop: number) => string;
  /** 頭の上に描くもの（リボン・ばんそうこう） */
  front?: (p: CharPose, headTop: number) => string;
  /** まつげ */
  lashes?: boolean;
  /** 服のすそをギザギザにする（ゾンビ） */
  ragged?: boolean;
}

const r = (x: number, y: number, w: number, h: number, fill: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;

/** 外側に濃いふちを付けた四角 */
const block = (x: number, y: number, w: number, h: number, fill: string) =>
  r(x - 0.5, y - 0.5, w + 1, h + 1, C.outline) + r(x, y, w, h, fill);

const SKINS: Record<CharacterId, Skin> = {
  boy: {
    // G/g = 草、D/d = 土、s = 下のかげ。顔のまわりには濃い点を置かない（表情が読めるように）
    head: [
      'gGGgGGGGgGGG',
      'GGGGGgGGGGgG',
      'GgGGGGGgGGGG',
      'GGDGGgGGDGGD',
      'DGDDGDGDDDGD',
      'DDDDDDDDDDDd',
      'dDDDDDDDDDDD',
      'DDDDDDDDDDDd',
      'DDDDDDDDDDDD',
      'dDDDDDDDDDDD',
      'DDDDDDDDDDDd',
      'ssssssssssss',
    ],
    palette: { G: '#6abe30', g: '#4b8b24', D: '#a0693a', d: '#7a4e2a', s: '#5e3a1e' },
    shirt: '#3aa0e8',
    shirtDark: '#226aa8',
    skin: '#f0b98a',
    skinDark: '#c98a5c',
    pants: '#2e3a8c',
    shoe: '#3b3b3b',
    chest: (y) => r(-1, y + 1, 2, 1, C.white),
  },
  girl: {
    // P/p = さくらの葉、W/w = 白っぽい木、s = 下のかげ
    head: [
      'pPPpPPPPpPPP',
      'PPPPPpPPPPpP',
      'PpPPPPPpPPPP',
      'PPWPPpPPWPPW',
      'WPWWPWPWWWPW',
      'WWWWWWWWWWWw',
      'wWWWWWWWWWWW',
      'WWWWWWWWWWWw',
      'WWWWWWWWWWWW',
      'wWWWWWWWWWWW',
      'WWWWWWWWWWWw',
      'ssssssssssss',
    ],
    palette: { P: '#ff9ec7', p: '#e8679f', W: '#f5dfb8', w: '#d9bd8c', s: '#b8935e' },
    shirt: '#ff5fa2',
    shirtDark: '#c43c7a',
    skin: '#f6c9a0',
    skinDark: '#d39a6c',
    pants: '#ffffff',
    shoe: '#d9304a',
    skirt: '#8a5cf0',
    lashes: true,
    chest: (y) => r(-1, y + 1, 1, 1, '#ffe14d') + r(0, y + 1, 1, 1, '#ffe14d') + r(-0.5, y + 2, 1, 1, '#ffe14d'),
    back: (p, top) => {
      // ツインテール：頭の左右から下がり、動きに合わせてゆれる
      const swing = Math.sin(p.t * 7) * 12 - p.tilt * 0.6 + (p.y < -1 ? 30 : 0) + (p.squash < 0.9 ? -15 : 0);
      const tail = (px: number, dir: 1 | -1) => {
        // 左（dir=-1）は時計回り＝外側へ。右は反時計回り
        const a = -dir * (8 + swing * 0.45);
        const x = px + dir * 0.5 - 1.5;
        return (
          `<g transform="rotate(${a.toFixed(1)} ${px} ${top + 2})">` +
          block(px - 1, top + 1, 2, 2, '#ff3060') +
          block(x, top + 3, 3, 4, '#ff9ec7') +
          block(x, top + 7, 3, 4, '#e8679f') +
          block(x + 0.5, top + 11, 2, 2, '#ff9ec7') +
          '</g>'
        );
      };
      return tail(-7.5, -1) + tail(7.5, 1);
    },
    front: (_p, top) =>
      // リボン（頭の右上）
      block(3, top - 2, 2, 2, '#ff3060') + block(7, top - 2, 2, 2, '#ff3060') + block(5, top - 1.5, 2, 2, '#ffd23c'),
  },
  zombie: {
    // Z/z = くすんだ緑の肌、h = ぼさぼさの髪、s = かげ
    head: [
      'hhhhHhhhhhHh',
      'hHhhhhhHhhhh',
      'hhZhhhZhhZhh',
      'ZZZZZZZZZZZZ',
      'ZZZZZZZZzZZZ',
      'ZZZZZZZZZZZZ',
      'zZZZZZZZZZZZ',
      'ZZZZZZZZZZZz',
      'ZZZZZZZZZZZZ',
      'ZZzZZZZZZZZZ',
      'ZZZZZZZZZZZZ',
      'ssssssssssss',
    ],
    palette: { Z: '#8fbf6a', z: '#6d9a4e', h: '#3f5a2c', H: '#2c4020', s: '#5a7d40' },
    shirt: '#e0883a',
    shirtDark: '#a85c1e',
    skin: '#8fbf6a',
    skinDark: '#6d9a4e',
    pants: '#5c5c66',
    shoe: '#3b3b3b',
    ragged: true,
    front: (_p, top) =>
      // ばんそうこう（ほっぺ）
      r(8, top + 9, 3, 1, '#ffd8a8') + r(9, top + 9, 1, 1, '#e0b080'),
  },
};

const EYES: Record<EyeKind, [string[], string[]]> = {
  normal: [['...', 'W#.', '##.'], ['...', '.W#', '.##']],
  big: [['W#.', '##.', '##.'], ['.W#', '.##', '.##']],
  happy: [['.#.', '#.#', '...'], ['.#.', '#.#', '...']],
  star: [['.Y.', 'YYY', '.Y.'], ['.Y.', 'YYY', '.Y.']],
  x: [['#.#', '.#.', '#.#'], ['#.#', '.#.', '#.#']],
  closed: [['...', '###', '...'], ['...', '###', '...']],
  zombie: [['...', 'zR.', 'zz.'], ['...', '.Rz', '.zz']],
};

const MOUTHS: Record<MouthKind, string[]> = {
  smile: ['#..#', '.##.'],
  open: ['####', '#RR#'],
  bigopen: ['#RR#', '#RR#'],
  o: ['.##.', '.##.'],
  flat: ['....', '####'],
  wavy: ['#.#.', '.#.#'],
  grin: ['####', '.##.'],
};

const MASK_COLOR: Record<string, string> = { '#': C.black, W: C.white, Y: C.yellow, R: C.red, z: C.zEye };

const mask = (rows: string[], ox: number, oy: number) => {
  let s = '';
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const col = MASK_COLOR[row[i]];
      if (col) s += r(ox + i, oy + j, 1, 1, col);
    }
  });
  return s;
};

const renderHead = (skin: Skin, p: CharPose, hx: number, hy: number) => {
  let s = r(hx - 0.5, hy - 0.5, 13, 13, C.outline);
  skin.head.forEach((row, j) => {
    for (let i = 0; i < 12; i++) s += r(hx + i, hy + j, 1, 1, skin.palette[row[i]] ?? '#ff00ff');
  });
  const [eL, eR] = EYES[p.eyes];
  s += mask(eL, hx + 2, hy + 5);
  s += mask(eR, hx + 7, hy + 5);
  if (skin.lashes && (p.eyes === 'normal' || p.eyes === 'big')) {
    s += r(hx + 1, hy + 5, 1, 1, C.black) + r(hx + 10, hy + 5, 1, 1, C.black);
  }
  s += mask(MOUTHS[p.mouth], hx + 4, hy + 8);
  if (p.blush) s += r(hx + 1, hy + 8, 1, 1, C.pink) + r(hx + 10, hy + 8, 1, 1, C.pink);
  return s;
};

const renderArm = (skin: Skin, pivotX: number, pivotY: number, arm: ArmPose, side: 1 | -1) => {
  const len = Math.max(2, Math.round(arm.len));
  // 左腕（side=-1）は時計回りが外側、右腕は反時計回りが外側
  const deg = side === -1 ? arm.angle : -arm.angle;
  let s = `<g transform="rotate(${deg.toFixed(1)} ${pivotX} ${pivotY})">`;
  const x = pivotX - 1;
  s += r(x - 0.5, pivotY - 0.5, 3, len + 1, C.outline);
  s += r(x, pivotY, 2, 2, skin.shirt);
  s += r(x, pivotY + 2, 2, Math.max(0, len - 4), skin.skin);
  // 長く伸びた腕は、ブロックの継ぎ目を見せる（ビヨーン感）
  if (len > 8) for (let k = 4; k < len - 3; k += 3) s += r(x, pivotY + k, 2, 0.5, skin.skinDark);
  s += r(x, pivotY + len - 2, 2, 2, skin.skinDark);
  s += '</g>';
  return s;
};

const renderAura = (p: CharPose, topY: number) => {
  if (p.aura <= 0) return '';
  const colors =
    p.aura >= 3
      ? ['#ff4d4d', '#ffb84d', '#fff14d', '#5dff6a', '#4dd2ff', '#b44dff']
      : p.aura >= 2
        ? ['#ff9a3c', '#ffd23c', '#ff6a3c']
        : ['#fff27a', '#ffe14d'];
  const n = 12 + p.aura * 8;
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p.t * (1 + p.aura * 0.6);
    const rad = 13 + p.aura * 2.5 + Math.sin(p.t * 9 + i * 1.7) * 1.8;
    const cx = Math.cos(a) * rad;
    const cy = topY / 2 + Math.sin(a) * rad * 1.15;
    const size = 1 + ((i + Math.floor(p.t * 12)) % 3 === 0 ? 1 : 0);
    s += `<rect x="${(cx - size / 2).toFixed(1)}" y="${(cy - size / 2).toFixed(1)}" width="${size}" height="${size}" fill="${colors[(i + Math.floor(p.t * 8)) % colors.length]}" opacity="0.9"/>`;
  }
  return s;
};

/** pose → SVG の中身（<svg> の内側に入れる文字列） */
export const renderCharacter = (id: CharacterId, p: CharPose): string => {
  const skin = SKINS[id];
  const legLenL = 4 * p.legL;
  const legLenR = 4 * p.legR;
  const hipY = -Math.max(legLenL, legLenR);
  const bodyTop = hipY - 6;
  const headTop = bodyTop - 12 + p.headBob;

  let body = '';
  if (skin.back) body += skin.back(p, headTop);
  // 足（腰から下に伸ばす）
  const leg = (x: number, len: number) =>
    block(x, hipY, 3, Math.max(1, len), skin.pants) + r(x, hipY + Math.max(1, len) - 1, 3, 1, skin.shoe);
  body += leg(-4, legLenL);
  body += leg(1, legLenR);
  // 胴
  body += block(-4, bodyTop, 8, 6, skin.shirt) + r(-4, bodyTop + 5, 8, 1, skin.shirtDark);
  if (skin.chest) body += skin.chest(bodyTop);
  if (skin.ragged) body += r(-3, bodyTop + 5, 1, 1, skin.skin) + r(0, bodyTop + 5, 1, 1, skin.skin) + r(2, bodyTop + 5, 1, 1, skin.skin);
  if (skin.skirt) body += block(-5, bodyTop + 4, 10, 3, skin.skirt) + r(-5, bodyTop + 6, 10, 1, '#6a3cc8');
  // 腕
  body += renderArm(skin, -5, bodyTop + 0.5, p.armL, -1);
  body += renderArm(skin, 5, bodyTop + 0.5, p.armR, 1);
  // 頭
  body += renderHead(skin, p, -6, headTop);
  if (skin.front) body += skin.front(p, headTop);

  const sx = 1 / p.squash;
  return (
    `<g transform="translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${p.tilt.toFixed(1)}) scale(${sx.toFixed(3)} ${p.squash.toFixed(3)})">` +
    renderAura(p, headTop) +
    body +
    '</g>'
  );
};

/** <svg> の viewBox。腕を伸ばしたりジャンプしても切れない大きさ（パンチは overflow: visible ではみ出す） */
export const CHAR_VIEWBOX = '-20 -38 40 42';
export const CHAR_VIEW = { x: -20, y: -38, w: 40, h: 42 };

// --- アニメ（時間 t 秒 → pose）。param は動きごとの追加の値（パンチの届く長さなど） ---

export type MotionName =
  | 'idle'
  | 'charge'
  | 'count'
  | 'cheer'
  | 'shout'
  | 'feverDance'
  | 'jump'
  | 'trip'
  | 'punch'
  | 'beam'
  | 'zWalk'
  | 'zHit'
  | 'zTaunt';

interface Motion {
  /** 1回の長さ（秒）。loop のものは長さで割り切れる周期にする */
  duration: number;
  loop: boolean;
  pose: (t: number, param: number) => CharPose;
}

const TAU = Math.PI * 2;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);

export const MOTIONS: Record<MotionName, Motion> = {
  // 待機：弾む、ときどきまばたき
  idle: {
    duration: 2.4,
    loop: true,
    pose: (t) => {
      const p = neutralPose();
      const ph = (t % 0.6) / 0.6;
      p.squash = 1 + 0.06 * Math.sin(ph * TAU);
      p.y = -Math.abs(Math.sin(ph * Math.PI)) * 1.2;
      p.armL.angle = 18 + 10 * Math.sin(ph * TAU);
      p.armR.angle = 18 - 10 * Math.sin(ph * TAU);
      p.headBob = Math.sin(ph * TAU) > 0.7 ? -0.5 : 0;
      if (t % 2.4 > 2.25) p.eyes = 'closed';
      return p;
    },
  },
  // ため：体をちぢめてぷるぷる
  charge: {
    duration: 0.4,
    loop: true,
    pose: (t) => {
      const p = neutralPose();
      p.squash = 0.82 + 0.03 * Math.sin(t * 60);
      p.x = Math.sin(t * 90) * 0.4;
      p.armL = { angle: 40, len: 4 };
      p.armR = { angle: 40, len: 4 };
      p.eyes = 'closed';
      p.mouth = 'flat';
      p.aura = 1;
      return p;
    },
  },
  // カウント：踏みこんでこぶしを突き上げる
  count: {
    duration: 0.45,
    loop: false,
    pose: (t) => {
      const p = neutralPose();
      if (t < 0.1) {
        p.squash = 0.78;
        p.armR = { angle: 30, len: 4 };
      } else {
        const k = ease((t - 0.1) / 0.18);
        p.squash = 0.78 + 0.34 * k - 0.1 * ease((t - 0.28) / 0.17);
        p.armR = { angle: 30 + 145 * k, len: 4 + 7 * k };
        p.armL = { angle: 25, len: 5 };
        p.eyes = 'big';
        p.mouth = 'open';
      }
      p.aura = 1;
      return p;
    },
  },
  // 正解：つぶれて弾み、万歳
  cheer: {
    duration: 0.8,
    loop: false,
    pose: (t) => {
      const p = neutralPose();
      p.eyes = 'happy';
      p.mouth = 'open';
      p.blush = true;
      if (t < 0.1) {
        p.squash = 0.72;
        p.armL = { angle: 40, len: 4 };
        p.armR = { angle: 40, len: 4 };
      } else {
        const k = (t - 0.1) / 0.7;
        p.y = -8 * Math.sin(Math.min(1, k * 1.6) * Math.PI);
        p.squash = k < 0.62 ? 1.15 : 1 - 0.18 * Math.sin(((k - 0.62) / 0.38) * Math.PI);
        const up = 150 + 15 * Math.sin(k * TAU * 2);
        p.armL = { angle: up, len: 8 };
        p.armR = { angle: up, len: 8 };
      }
      return p;
    },
  },
  // さけぶ：星目、腕がビヨーンと伸びる
  shout: {
    duration: 0.5,
    loop: true,
    pose: (t) => {
      const p = neutralPose();
      const ph = (t % 0.5) / 0.5;
      p.eyes = 'star';
      p.mouth = 'bigopen';
      p.squash = 1.06 + 0.06 * Math.sin(ph * TAU);
      p.armL = { angle: 145 + 12 * Math.sin(ph * TAU), len: 11 + 4 * Math.sin(ph * TAU) };
      p.armR = { angle: 145 - 12 * Math.sin(ph * TAU), len: 11 - 4 * Math.sin(ph * TAU) };
      p.headBob = -1;
      p.x = Math.sin(ph * TAU * 2) * 0.3;
      p.y = -Math.abs(Math.sin(ph * TAU)) * 1.5;
      p.aura = 2;
      return p;
    },
  },
  // FEVER ダンス：左右の足を交互に伸ばして踊る
  feverDance: {
    duration: 0.8,
    loop: true,
    pose: (t) => {
      const p = neutralPose();
      const s = Math.sin(((t % 0.8) / 0.8) * TAU);
      p.legL = 1 + 0.9 * Math.max(0, s);
      p.legR = 1 + 0.9 * Math.max(0, -s);
      p.tilt = 12 * s;
      p.armL = { angle: s > 0 ? 165 : 50, len: s > 0 ? 10 : 6 };
      p.armR = { angle: s > 0 ? 50 : 165, len: s > 0 ? 6 : 10 };
      p.eyes = Math.abs(s) > 0.6 ? 'star' : 'happy';
      p.mouth = 'open';
      p.blush = true;
      p.aura = 3;
      p.squash = 1 + 0.05 * Math.abs(s);
      return p;
    },
  },
  // ジャンプ：足が伸びて大ジャンプ
  jump: {
    duration: 1.0,
    loop: false,
    pose: (t) => {
      const p = neutralPose();
      p.eyes = 'star';
      p.mouth = 'open';
      p.blush = true;
      if (t < 0.15) {
        p.squash = 0.68;
        p.armL = { angle: 30, len: 4 };
        p.armR = { angle: 30, len: 4 };
        p.eyes = 'closed';
      } else if (t < 0.85) {
        const k = (t - 0.15) / 0.7;
        p.legL = p.legR = k < 0.2 ? 1 + 1.2 * (k / 0.2) : 2.2 - 1.2 * Math.min(1, (k - 0.2) / 0.3);
        p.y = -16 * Math.sin(k * Math.PI);
        p.squash = 1.12;
        p.armL = { angle: 170, len: 13 };
        p.armR = { angle: 170, len: 13 };
      } else {
        p.squash = 0.8 + 0.2 * ((t - 0.85) / 0.15);
        p.armL = { angle: 120, len: 7 };
        p.armR = { angle: 120, len: 7 };
      }
      p.aura = 2;
      return p;
    },
  },
  // ずっこけ：傾いて片足が跳ね上がる
  trip: {
    duration: 1.0,
    loop: false,
    pose: (t) => {
      const p = neutralPose();
      p.eyes = 'x';
      p.mouth = 'wavy';
      if (t < 0.7) {
        const k = ease(t / 0.25);
        p.tilt = -38 * k;
        p.legR = 1 - 0.6 * k;
        p.legL = 1 + 0.3 * k;
        p.x = -2 * k;
        p.armL = { angle: 110 + 30 * Math.sin(t * 30), len: 6 };
        p.armR = { angle: 70 - 30 * Math.sin(t * 30), len: 6 };
        p.headBob = 1;
      } else {
        const k = ease((t - 0.7) / 0.3);
        p.tilt = -38 * (1 - k);
        p.x = -2 * (1 - k);
        p.eyes = 'normal';
        p.mouth = 'grin';
      }
      return p;
    },
  },
  // パンチ：右腕が param マスまでビヨーンと伸びる
  punch: {
    duration: 0.6,
    loop: false,
    pose: (t, reach) => {
      const p = neutralPose();
      p.eyes = 'big';
      p.mouth = 'bigopen';
      p.armL = { angle: 35, len: 5 };
      if (t < 0.1) {
        p.squash = 0.85;
        p.x = -1.5;
        p.tilt = -8;
        p.armR = { angle: 20, len: 4 };
        p.eyes = 'closed';
      } else if (t < 0.32) {
        const k = ease((t - 0.1) / 0.12);
        p.x = 1.5;
        p.tilt = 6;
        p.squash = 1.08;
        p.armR = { angle: 92, len: 5 + (Math.max(5, reach) - 5) * k };
      } else {
        const k = ease((t - 0.32) / 0.28);
        p.x = 1.5 * (1 - k);
        p.tilt = 6 * (1 - k);
        p.armR = { angle: 92 - 60 * k, len: Math.max(5, reach) * (1 - k) + 5 * k };
        p.eyes = 'happy';
        p.mouth = 'open';
      }
      p.aura = 1;
      return p;
    },
  },
  // ビーム：両手を上げてから、右へつき出す
  beam: {
    duration: 0.7,
    loop: false,
    pose: (t) => {
      const p = neutralPose();
      p.eyes = 'star';
      p.mouth = 'open';
      p.blush = true;
      if (t < 0.15) {
        p.armL = { angle: 165, len: 7 };
        p.armR = { angle: 165, len: 7 };
        p.squash = 1.08;
        p.y = -2;
      } else {
        const k = ease((t - 0.15) / 0.12);
        p.armR = { angle: 165 - 75 * k, len: 7 + 3 * k };
        p.armL = { angle: 165 - 30 * k, len: 6 };
        p.tilt = 8 * k * (1 - clamp01((t - 0.5) / 0.2));
        p.x = 1;
      }
      p.aura = 2;
      return p;
    },
  },
  // ゾンビの歩き：腕を前（横）につき出して、よたよた
  zWalk: {
    duration: 0.8,
    loop: true,
    pose: (t) => {
      const p = neutralPose();
      const s = Math.sin(((t % 0.8) / 0.8) * TAU);
      p.eyes = 'zombie';
      p.mouth = 'wavy';
      p.armL = { angle: 95 + 6 * s, len: 6 };
      p.armR = { angle: 95 - 6 * s, len: 6 };
      p.legL = 1 + 0.15 * Math.max(0, s);
      p.legR = 1 + 0.15 * Math.max(0, -s);
      p.tilt = 5 * s;
      p.headBob = Math.abs(s) > 0.8 ? 0.5 : 0;
      return p;
    },
  },
  // ゾンビがやられる：のけぞる
  zHit: {
    duration: 0.5,
    loop: false,
    pose: (t) => {
      const p = neutralPose();
      const k = ease(t / 0.12);
      p.eyes = 'x';
      p.mouth = 'o';
      p.tilt = 35 * k;
      p.squash = 0.85;
      p.armL = { angle: 150, len: 6 };
      p.armR = { angle: 150, len: 6 };
      p.x = 2 * k;
      return p;
    },
  },
  // ゾンビがわらう（まちがえたとき）
  zTaunt: {
    duration: 0.8,
    loop: false,
    pose: (t) => {
      const p = neutralPose();
      const s = Math.sin(t * 25);
      p.eyes = 'zombie';
      p.mouth = 'bigopen';
      p.armL = { angle: 150 + 20 * s, len: 10 };
      p.armR = { angle: 150 - 20 * s, len: 10 };
      p.y = -Math.abs(s) * 1.5;
      p.squash = 1 + 0.05 * s;
      return p;
    },
  },
};

/** いまの動き（くり返し）と、1回だけの動きを重ねて pose を出す */
export class CharDirector {
  private base: MotionName;
  private baseStart = 0;
  private shot: MotionName | null = null;
  private shotStart = 0;
  private shotParam = 0;

  constructor(base: MotionName = 'idle') {
    this.base = base;
  }

  setBase(m: MotionName, now: number) {
    if (this.base === m) return;
    this.base = m;
    this.baseStart = now;
  }

  play(m: MotionName, now: number, param = 0) {
    const motion = MOTIONS[m];
    if (motion.loop) return this.setBase(m, now);
    this.shot = m;
    this.shotStart = now;
    this.shotParam = param;
  }

  pose(now: number): CharPose {
    if (this.shot) {
      const t = now - this.shotStart;
      const m = MOTIONS[this.shot];
      if (t < m.duration) {
        const p = m.pose(t, this.shotParam);
        p.t = now;
        return p;
      }
      this.shot = null;
    }
    const m = MOTIONS[this.base];
    const t = now - this.baseStart;
    const p = m.pose(m.loop ? t % m.duration : Math.min(t, m.duration), 0);
    p.t = now;
    return p;
  }
}
