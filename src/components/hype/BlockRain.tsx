import React, { useEffect, useRef } from 'react';

// タイトル画面の背景：ドットのブロック（草・土・石・金・ダイヤ・TNT）がふってくる。
// 画面の一番うしろに置き、クリックは通す。

type Pattern = { colors: string[]; rows: string[] };

// 4×4 マスの模様。数字は colors の番号
const BLOCKS: Pattern[] = [
  { colors: ['#6abe30', '#4b8b24', '#a0693a', '#7a4e2a'], rows: ['0101', '1002', '2232', '3223'] }, // 草
  { colors: ['#a0693a', '#7a4e2a'], rows: ['0100', '0001', '1000', '0010'] }, // 土
  { colors: ['#8a8a8a', '#6e6e6e', '#a8a8a8'], rows: ['0120', '1002', '0210', '2001'] }, // 石
  { colors: ['#ffd84d', '#c9a800', '#fff6b0'], rows: ['0210', '1002', '0021', '2100'] }, // 金
  { colors: ['#5ee8e0', '#2fb3ad', '#d8fffd'], rows: ['0201', '1020', '0102', '2010'] }, // ダイヤ
  { colors: ['#e84a4a', '#ffffff', '#1d1209'], rows: ['0000', '1221', '1221', '0000'] }, // TNT
];

interface Drop {
  x: number;
  y: number;
  vy: number;
  size: number;
  kind: number;
  sway: number;
  phase: number;
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
        size: 24 + Math.round(Math.random() * 4) * 8,
        kind: Math.floor(Math.random() * BLOCKS.length),
        sway: 10 + Math.random() * 20,
        phase: Math.random() * Math.PI * 2,
      });
    for (let i = 0; i < 26; i++) add(Math.random() * h);

    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
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
        const b = BLOCKS[d.kind];
        const c = d.size / 4;
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#1d1209';
        ctx.fillRect(x - 3, y - 3, d.size + 6, d.size + 6);
        b.rows.forEach((row, j) => {
          for (let k = 0; k < 4; k++) {
            ctx.fillStyle = b.colors[Number(row[k])];
            ctx.fillRect(x + k * c, y + j * c, c, c);
          }
        });
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
