import React, { useEffect, useRef } from 'react';
import { TileName, tileImage } from '../../lib/hype/assets';

// タイトル画面の背景：ドットのブロック（Gemini のタイル）がふってくる。
// 画面の一番うしろに置き、クリックは通す。

const TILES: readonly TileName[] = [
  'grass', 'dirt', 'stone', 'ore-gold', 'ore-diamond', 'tnt',
  'ore-emerald', 'ore-ruby', 'amethyst', 'planks', 'brick', 'leaves', 'glow',
];

/** 絵の読みこみ前に使う色（ブロックごとに1色） */
const FALLBACK: Record<TileName, string> = {
  grass: '#6abe30', dirt: '#a0693a', stone: '#8a8a8a', cobble: '#7a7a7a',
  'ore-gold': '#ffd84d', 'ore-diamond': '#5ee8e0', 'ore-emerald': '#3ccf5a', 'ore-ruby': '#e84a4a',
  nether: '#7a1f1f', magma: '#ff8a1f', glow: '#ffe7a0', amethyst: '#9a5ae0',
  planks: '#c08a4a', brick: '#a8483a', tnt: '#e84a4a', leaves: '#3f8a24',
};

interface Drop {
  x: number;
  y: number;
  vy: number;
  size: number;
  kind: TileName;
  sway: number;
  phase: number;
  spin: number;
}

export const BlockRain: React.FC<{ className?: string }> = ({ className }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const drops: Drop[] = [];
    const add = (y?: number) =>
      drops.push({
        x: Math.random() * w,
        y: y ?? -60,
        vy: 40 + Math.random() * 90,
        size: 32 + Math.round(Math.random() * 4) * 8,
        kind: TILES[Math.floor(Math.random() * TILES.length)],
        sway: 10 + Math.random() * 20,
        phase: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.8,
      });
    for (let i = 0; i < 26; i++) add(Math.random() * h);

    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.6;
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.y += d.vy * dt;
        if (d.y > h + 60) {
          drops.splice(i, 1);
          add();
          continue;
        }
        const x = Math.round(d.x + Math.sin(now / 700 + d.phase) * d.sway);
        const y = Math.round(d.y);
        const half = d.size / 2;
        ctx.save();
        ctx.translate(x + half, y + half);
        ctx.rotate(Math.sin(now / 900 + d.phase) * d.spin);
        ctx.fillStyle = '#1d1209';
        ctx.fillRect(-half - 3, -half - 3, d.size + 6, d.size + 6);
        const img = tileImage(d.kind);
        if (img) ctx.drawImage(img, -half, -half, d.size, d.size);
        else {
          ctx.fillStyle = FALLBACK[d.kind];
          ctx.fillRect(-half, -half, d.size, d.size);
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
};
