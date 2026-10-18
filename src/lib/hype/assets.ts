// マシマシモードの絵（Gemini の Web 画面で作り、手元でドット化したもの。台帳は docs/assets.md）。
// どれもビルドに同梱する（外部通信なし）。小さな PNG は Vite が data URL にして JS に入れる。
import type { CSSProperties } from 'react';

const byName = (m: Record<string, string>) =>
  Object.fromEntries(Object.entries(m).map(([path, url]) => [path.split('/').pop()!.replace(/\.png$/, ''), url]));

const TILE_URL = byName(import.meta.glob<string>('../../assets/hype/tiles/*.png', { eager: true, import: 'default' }));
const SPRITE_URL = byName(import.meta.glob<string>('../../assets/hype/parts/*.png', { eager: true, import: 'default' }));
const UI_URL = byName(import.meta.glob<string>('../../assets/hype/ui/*.png', { eager: true, import: 'default' }));
const POSE_URL = byName(import.meta.glob<string>('../../assets/hype/pose/*.png', { eager: true, import: 'default' }));

/** 背景の柄（16×16 か 32×32 ドット。くり返して敷く） */
export type TileName =
  | 'grass' | 'dirt' | 'stone' | 'cobble'
  | 'ore-gold' | 'ore-diamond' | 'ore-emerald' | 'ore-ruby'
  | 'nether' | 'magma' | 'glow' | 'amethyst'
  | 'planks' | 'brick' | 'tnt' | 'leaves';

/** パーティクルの粒（20×20 ドット） */
export type SpriteName = 'star' | 'heart' | 'coin' | 'diamond' | 'sparkle' | 'note' | 'emerald' | 'block';

/** ふきだし・札の枠 */
export type UiName = 'bubble' | 'shout' | 'bang' | 'plate';

/** キャラの決めポーズ */
export type PoseName = 'fever-boy' | 'fever-girl' | 'rank-trophy';

export const tileUrl = (name: TileName): string => TILE_URL[name];
export const uiUrl = (name: UiName): string => UI_URL[name];
export const poseUrl = (name: PoseName): string => POSE_URL[name];

/** 背景に柄を敷く style。1ドットが px ドット（16 ドットの柄で px=4 なら 64px 角） */
export const tileStyle = (name: TileName, px = 4): CSSProperties => {
  const dots = name === 'grass' || name === 'dirt' || name === 'stone' || name === 'cobble' || name.startsWith('ore-') ? 16 : 32;
  return { backgroundImage: `url(${TILE_URL[name]})`, backgroundSize: `${dots * px}px`, imageRendering: 'pixelated' };
};

// Canvas に描くための画像。はじめて使うときに読みこむ（読みこみ前は描かない）
const cache = new Map<string, HTMLImageElement>();
const image = (url: string): HTMLImageElement | null => {
  let img = cache.get(url);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = url;
    cache.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
};

export const spriteImage = (name: SpriteName) => image(SPRITE_URL[name]);
export const tileImage = (name: TileName) => image(TILE_URL[name]);
export const uiImage = (name: UiName) => image(UI_URL[name]);

/** 最初の画面で呼んでおくと、はじめての演出から絵が出る */
export function preloadHypeImages() {
  Object.values(SPRITE_URL).forEach(image);
  Object.values(TILE_URL).forEach(image);
  Object.values(UI_URL).forEach(image);
  Object.values(POSE_URL).forEach(image);
}
