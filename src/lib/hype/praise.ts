// ほめことば。1操作ごとに必ず何かほめる。ひらがな・カタカナ中心（小学生向け）。

export type PraiseKind =
  | 'key'
  | 'erase'
  | 'correct'
  | 'correctBig'
  | 'miss'
  | 'hint'
  | 'pass'
  | 'select'
  | 'start'
  | 'option'
  | 'fever'
  | 'result'
  | 'best';

const LINES: Record<PraiseKind, string[]> = {
  key: ['いいね！', 'ナイス！', 'そのちょうし！', 'はやい！', 'いけいけ！', 'かっこいい！', 'きもちいい！', 'リズムいい！', 'さえてる！', 'ノッてる！'],
  erase: ['なおせてえらい！', 'みなおし、かしこい！', 'ていねい！', 'さすが！'],
  correct: ['せいかい！すごい！', 'てんさい！', 'やったね！', 'かんぺき！', 'さいこう！', 'ばっちり！'],
  correctBig: ['すごすぎ！！', 'てんさいすぎる！！', 'とまらない！！', 'さんすうマスター！！', 'でんせつ！！', 'むてき！！'],
  miss: ['おしい！', 'ナイスチャレンジ！', 'ちょうせんしてえらい！', 'つぎはいける！', 'いいところまでいった！', 'がんばってるの、しってるよ！'],
  hint: ['ヒントつかえて、えらい！', 'かしこいさくせん！', 'しらべるの、だいじ！'],
  pass: ['ナイスはんだん！', 'つぎいこう！', 'きりかえはやい！'],
  select: ['それえらぶの、センスある！', 'いいね！', 'わかってる〜！', 'いいせんたく！', 'ナイスチョイス！'],
  start: ['いくぞー！', 'きみならできる！', 'たのしもう！'],
  option: ['せっていできて、えらい！', 'じぶんでえらべて、すごい！'],
  fever: ['フィーバーだ！！', 'もえてきた！！', 'さいこうちょう！！'],
  result: ['さいごまでやりきった！えらすぎ！', 'おつかれさま！すごかった！', 'きょうもがんばった！'],
  best: ['じこベストこうしん！！', 'きのうのじぶんをこえた！！'],
};

let lastIndex: Partial<Record<PraiseKind, number>> = {};

/** 同じことばが続かないように選ぶ。rnd は試験用に差しかえられる */
export const pickPraise = (kind: PraiseKind, rnd: () => number = Math.random): string => {
  const lines = LINES[kind];
  if (lines.length === 1) return lines[0];
  let i = Math.floor(rnd() * lines.length);
  if (i === lastIndex[kind]) i = (i + 1) % lines.length;
  lastIndex[kind] = i;
  return lines[i];
};

export const resetPraise = () => {
  lastIndex = {};
};
