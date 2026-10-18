import React from 'react';
import { glyphUrl } from '../../lib/hype/assets';

// Gemini で描いたブロック文字（金色）で文字列を並べる。
// 全部の文字に絵があるときだけ絵で出し、1文字でも無い（日本語など）ときは今までどおりの文字で出す。
// 大きさは文字の大きさ（text-7xl など）に合わせる（絵の高さ = 1em）。色は金を基準に CSS の filter で変える。

export type GlyphTone = 'gold' | 'orange' | 'red' | 'green' | 'blue' | 'purple' | 'pink' | 'rainbow';

const TONE_FILTER: Record<Exclude<GlyphTone, 'rainbow'>, string> = {
  gold: '',
  orange: 'hue-rotate(-18deg) saturate(1.4)',
  red: 'hue-rotate(-45deg) saturate(1.5)',
  green: 'hue-rotate(75deg) saturate(1.2)',
  blue: 'hue-rotate(170deg) saturate(1.3)',
  purple: 'hue-rotate(-140deg) saturate(1.2)',
  pink: 'hue-rotate(-75deg) saturate(1.2)',
};

/** hype-shout の色のクラスから、文字の色を決める */
export const toneOf = (cls: string): GlyphTone =>
  cls.includes('hype-shout-rainbow') ? 'rainbow' : cls.includes('hype-shout-red') ? 'red' : cls.includes('hype-shout-green') ? 'green' : 'gold';

/** この文字列を全部絵で出せるか（空白は可） */
export const hasGlyphs = (text: string) => [...text].every((ch) => ch === ' ' || !!glyphUrl(ch));

/** 1文字ぶんの絵（空白はすきま）。filter に色・影を足せる */
export const Glyph: React.FC<{ ch: string; tone?: GlyphTone; extraFilter?: string; className?: string }> = ({
  ch,
  tone = 'gold',
  extraFilter = '',
  className = '',
}) => {
  if (ch === ' ') return <span className="inline-block w-[0.35em]" />;
  const toneFilter = tone === 'rainbow' ? '' : TONE_FILTER[tone];
  return (
    <img
      src={glyphUrl(ch)}
      alt={ch}
      draggable={false}
      className={`hype-glyph ${tone === 'rainbow' ? 'hype-glyph-rainbow' : ''} ${className}`}
      style={{ filter: `${toneFilter} drop-shadow(0.06em 0.06em 0 rgba(29,18,9,0.6)) ${extraFilter}`.trim() }}
    />
  );
};

/** 文字列を絵の文字で。絵が無い文字があれば、cls を付けた普通の文字で出す */
export const GlyphText: React.FC<{ text: string; cls: string; tone?: GlyphTone; className?: string }> = ({ text, cls, tone, className = '' }) => {
  if (!hasGlyphs(text)) return <span className={`${cls} ${className}`}>{text}</span>;
  const t = tone ?? toneOf(cls);
  // hype-shout の文字の影・色はいらないので、大きさなどのクラスだけ残す
  const sizeCls = cls.replace(/hype-shout(-\w+)?/g, '');
  // hype-quake などの自作クラスが display: inline-block を持つので、! で inline-flex を勝たせて折り返しを防ぐ（2桁のコンボが縦に割れた）
  return (
    <span className={`${sizeCls} ${className} !inline-flex items-end leading-none whitespace-nowrap`} aria-label={text}>
      {[...text].map((ch, i) => (
        <Glyph key={i} ch={ch} tone={t} />
      ))}
    </span>
  );
};
