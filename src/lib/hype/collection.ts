import { RULES } from './rules';
import type { Costume } from './characters';
import type { SoundPack } from './audio';

// 集めるもの（P3）。4つのカテゴリ × 6種（はじめから持っている1つ＋ガチャの5つ）。
// ガチャの中身は 4 × 5 = 20 種。乱数は引数で渡す純粋な関数にする（試算・確認用）。

export type Category = 'costume' | 'effect' | 'sound' | 'bg';
export type Rarity = 'N' | 'R' | 'SR' | 'SSR';
export const RARITIES: Rarity[] = ['N', 'R', 'SR', 'SSR'];

export interface Item {
  id: string;
  category: Category;
  name: string;
  /** はじめから持っている（ガチャには入らない）ものは null */
  rarity: Rarity | null;
  desc: string;
  costume?: Costume;
  /** パーティクル・紙ふぶきの色 */
  colors?: string[];
  sound?: SoundPack;
  /** プレイ画面の背景に重ねるクラス（src/index.css の hype-bgskin-*） */
  bgClass?: string;
}

export const CATEGORIES: { id: Category; name: string }[] = [
  { id: 'costume', name: '衣装' },
  { id: 'effect', name: 'エフェクト' },
  { id: 'sound', name: '音' },
  { id: 'bg', name: '背景' },
];

export const ITEMS: Item[] = [
  // --- 衣装（ブロッくんとブロッちゃんのカラー違い） ---
  { id: 'c-normal', category: 'costume', name: 'いつもの服', rarity: null, desc: 'はじめの服', costume: {} },
  {
    id: 'c-night', category: 'costume', name: 'よぞら', rarity: 'N', desc: '夜の色のおそろい',
    costume: { boy: { shirt: '#2b2f6b', shirtDark: '#1a1d45', pants: '#14162e' }, girl: { shirt: '#4a3a9c', shirtDark: '#30256a', skirt: '#2b2f6b' } },
  },
  {
    id: 'c-forest', category: 'costume', name: 'もりの子', rarity: 'N', desc: '葉っぱの緑',
    costume: { boy: { shirt: '#3f9a32', shirtDark: '#2a6a20', pants: '#5a3a1e' }, girl: { shirt: '#6abe30', shirtDark: '#4b8b24', skirt: '#a0693a' } },
  },
  {
    id: 'c-snow', category: 'costume', name: 'ゆきだるま', rarity: 'R', desc: 'まっ白でふわふわ',
    costume: { boy: { shirt: '#f4f8ff', shirtDark: '#c4d4ee', pants: '#8fb4e8', shoe: '#3a6ab8' }, girl: { shirt: '#ffffff', shirtDark: '#cfdcf2', skirt: '#9fd0ff', pants: '#e8f2ff' } },
  },
  {
    id: 'c-gold', category: 'costume', name: 'ゴールド', rarity: 'SR', desc: 'ピカピカの金',
    costume: { boy: { shirt: '#ffd23c', shirtDark: '#c99a10', pants: '#8a6a10', shoe: '#5a4208' }, girl: { shirt: '#ffe14d', shirtDark: '#d4a82a', skirt: '#ffb84d', shoe: '#c99a10' } },
  },
  {
    id: 'c-king', category: 'costume', name: 'おうさま', rarity: 'SSR', desc: '王かんとむらさきのマント色',
    costume: { boy: { shirt: '#8a3cd8', shirtDark: '#5a1e9c', pants: '#d9304a', shoe: '#ffd23c' }, girl: { shirt: '#b44dff', shirtDark: '#7a2ac8', skirt: '#ffd23c', shoe: '#ffd23c' }, crown: true },
  },

  // --- エフェクト（パーティクル・紙ふぶきの色） ---
  { id: 'e-normal', category: 'effect', name: 'いつものキラキラ', rarity: null, desc: 'はじめの色', colors: ['#ffe14d', '#6abe30', '#3aa0e8', '#ff8fb1', '#ffffff', '#ffb84d'] },
  { id: 'e-sakura', category: 'effect', name: 'さくら', rarity: 'N', desc: 'ピンクの花びら', colors: ['#ffc0d9', '#ff8fb1', '#ffffff', '#ff5fa2', '#ffe0ec'] },
  { id: 'e-sea', category: 'effect', name: 'うみのしぶき', rarity: 'N', desc: '青い水しぶき', colors: ['#4dd2ff', '#3aa0e8', '#ffffff', '#9fe8ff', '#226aa8'] },
  { id: 'e-fire', category: 'effect', name: 'ほのお', rarity: 'R', desc: 'あつい火の粉', colors: ['#ff4d4d', '#ffb84d', '#fff14d', '#ff7a1a', '#ffffff'] },
  { id: 'e-diamond', category: 'effect', name: 'ダイヤ', rarity: 'SR', desc: 'きらめく水色', colors: ['#b8fff8', '#4dfff0', '#ffffff', '#7ad8ff', '#e0ffff'] },
  { id: 'e-rainbow', category: 'effect', name: 'にじいろ', rarity: 'SSR', desc: '7色ぜんぶ', colors: ['#ff4d4d', '#ffb84d', '#fff14d', '#5dff6a', '#4dd2ff', '#6a6aff', '#b44dff'] },

  // --- 音（数字を打つ音・正解の音） ---
  { id: 's-normal', category: 'sound', name: 'ピコピコ', rarity: null, desc: 'はじめの音', sound: { wave: 'square', shift: 0 } },
  { id: 's-flute', category: 'sound', name: 'ふえ', rarity: 'N', desc: 'やわらかい音', sound: { wave: 'triangle', shift: 12 } },
  { id: 's-bell', category: 'sound', name: 'ベル', rarity: 'N', desc: 'チリン', sound: { wave: 'sine', shift: 12 } },
  { id: 's-robot', category: 'sound', name: 'ロボット', rarity: 'R', desc: 'ビビビ', sound: { wave: 'sawtooth', shift: -12 } },
  { id: 's-star', category: 'sound', name: 'ほしのおと', rarity: 'SR', desc: 'キラキラ高い音', sound: { wave: 'sine', shift: 24, double: true } },
  { id: 's-chip', category: 'sound', name: 'ゲームきのう', rarity: 'SSR', desc: 'ぶあつい 8ビット', sound: { wave: 'square', shift: 0, double: true } },

  // --- 背景（プレイ画面） ---
  { id: 'b-stone', category: 'bg', name: 'いしのかべ', rarity: null, desc: 'はじめの背景', bgClass: '' },
  { id: 'b-grass', category: 'bg', name: 'くさはら', rarity: 'N', desc: 'みどりの原っぱ', bgClass: 'hype-bgskin-grass' },
  { id: 'b-sand', category: 'bg', name: 'すなはま', rarity: 'N', desc: 'さらさらの砂', bgClass: 'hype-bgskin-sand' },
  { id: 'b-sea', category: 'bg', name: 'うみのそこ', rarity: 'R', desc: '青いうみ', bgClass: 'hype-bgskin-sea' },
  { id: 'b-sunset', category: 'bg', name: 'ゆうやけ', rarity: 'SR', desc: 'オレンジの空', bgClass: 'hype-bgskin-sunset' },
  { id: 'b-aurora', category: 'bg', name: 'オーロラ', rarity: 'SSR', desc: 'ゆれる光のカーテン', bgClass: 'hype-bgskin-aurora' },
];

export type ItemId = string;

const BY_ID = new Map(ITEMS.map((x) => [x.id, x]));
export const itemById = (id: ItemId): Item | undefined => BY_ID.get(id);

/** はじめから持っているもの（カテゴリごとに1つ） */
export const STARTER: Record<Category, ItemId> = {
  costume: 'c-normal',
  effect: 'e-normal',
  sound: 's-normal',
  bg: 'b-stone',
};

/** ガチャに入っているもの */
export const GACHA_ITEMS = ITEMS.filter((x) => x.rarity !== null);

export const isOwned = (owned: readonly ItemId[], id: ItemId) => Object.values(STARTER).includes(id) || owned.includes(id);

/** 装備しているもの（持っていない・知らない ID なら はじめのもの） */
export const getEquipped = (equipped: Partial<Record<Category, ItemId>>, owned: readonly ItemId[], category: Category): Item => {
  const id = equipped[category];
  const item = id ? itemById(id) : undefined;
  if (item && item.category === category && isOwned(owned, item.id)) return item;
  return itemById(STARTER[category])!;
};

/** ガチャの状態（保存データの一部） */
export interface GachaState {
  coins: number;
  items: ItemId[];
  shards: number;
  /** 最後に SR 以上が出てから引いた回数 */
  pity: number;
}

export interface PullResult {
  item: Item;
  rarity: Rarity;
  /** もう持っていた（かけらになった） */
  dup: boolean;
  /** 天井で SR 以上が確定した */
  byPity: boolean;
  /** 演出でいったん止まってから色が上がる */
  feint: boolean;
}

/** レア度をくじで決める。floor 以上のレア度しか出さない（天井） */
export const rollRarity = (r: number, floor: Rarity = 'N'): Rarity => {
  const from = RARITIES.indexOf(floor);
  const pool = RARITIES.slice(from);
  const total = pool.reduce((a, x) => a + RULES.gacha.rates[x], 0);
  let v = r * total;
  for (const x of pool) {
    v -= RULES.gacha.rates[x];
    if (v < 0) return x;
  }
  return pool[pool.length - 1];
};

/**
 * ガチャを1回引く。state を書き換える（コインを払う・アイテムかかけらを足す・天井の数を進める）。
 * コインが足りなければ null。rnd は 0〜1 の乱数を返す関数（3回使う）
 */
export const pullGacha = (state: GachaState, rnd: () => number = Math.random): PullResult | null => {
  if (state.coins < RULES.gacha.cost) return null;
  state.coins -= RULES.gacha.cost;
  const byPity = state.pity + 1 >= RULES.gacha.pity;
  const rarity = rollRarity(rnd(), byPity ? 'SR' : 'N');
  const pool = GACHA_ITEMS.filter((x) => x.rarity === rarity);
  const item = pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))];
  const dup = state.items.includes(item.id);
  if (dup) state.shards += 1;
  else state.items.push(item.id);
  state.pity = rarity === 'SR' || rarity === 'SSR' ? 0 : state.pity + 1;
  const feint = (rarity === 'SR' || rarity === 'SSR') && rnd() < RULES.gacha.feintChance;
  return { item, rarity, dup, byPity: byPity && (rarity === 'SR' || rarity === 'SSR'), feint };
};

/** かけらで、まだ持っていないものを1つ交換する。できなければ false */
export const exchangeShards = (state: GachaState, id: ItemId): boolean => {
  const item = itemById(id);
  if (!item || item.rarity === null || state.items.includes(id) || state.shards < RULES.gacha.shardsPerItem) return false;
  state.shards -= RULES.gacha.shardsPerItem;
  state.items.push(id);
  return true;
};

/** 図鑑の数（はじめのものもふくむ） */
export const collectionCount = (owned: readonly ItemId[]) => ITEMS.filter((x) => isOwned(owned, x.id)).length;
