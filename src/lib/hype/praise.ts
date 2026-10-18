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
  key: ['いいね！', 'ナイス！', 'そのちょうし！', '速い！', 'いけいけ！', 'かっこいい！', '気持ちいい！', 'リズムいい！', 'さえてる！', 'ノッてる！'],
  erase: ['直せてえらい！', '見直し、かしこい！', 'ていねい！', 'さすが！'],
  correct: ['正解！すごい！', '天才！', 'やったね！', '完ぺき！', '最高！', 'ばっちり！'],
  correctBig: ['すごすぎ！！', '天才すぎる！！', '止まらない！！', '算数マスター！！', '伝説！！', '無敵！！'],
  miss: ['おしい！', 'ナイスチャレンジ！', '挑戦してえらい！', '次はいける！', 'いいところまでいった！', 'がんばってるの、知ってるよ！'],
  hint: ['ヒント使えて、えらい！', 'かしこい作戦！', '調べるの、大事！'],
  pass: ['ナイス判断！', '次いこう！', '切りかえ早い！'],
  select: ['それ選ぶの、センスある！', 'いいね！', 'わかってる〜！', 'いい選択！', 'ナイスチョイス！'],
  start: ['いくぞー！', 'きみならできる！', '楽しもう！'],
  option: ['設定できて、えらい！', '自分で選べて、すごい！'],
  fever: ['フィーバーだ！！', '燃えてきた！！', '最高潮！！'],
  result: ['最後までやりきった！えらすぎ！', 'おつかれさま！すごかった！', '今日もがんばった！'],
  best: ['自己ベスト更新！！', '昨日の自分をこえた！！'],
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
