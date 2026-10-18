import React, { useLayoutEffect, useState } from 'react';

/** これより小さいウィンドウでは、この大きさの「仮の画面」に描いて縮める */
const BASE_W = 1280;
const BASE_H = 720;

const measure = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // 拡大はしない（上限 1）。仮の画面はウィンドウ ÷ 倍率 にして、いつも画面いっぱいに描く
  // 大きさ 0（非表示のタブなど）のときは 0 で割らないように等倍にする
  const scale = w > 0 && h > 0 ? Math.min(1, w / BASE_W, h / BASE_H) : 1;
  return { scale, w: w / scale, h: h / scale };
};

/**
 * ウィンドウが小さいときに中身をまるごと縮小する入れ物（docs/issues.md #4）。
 * 背景と演出の Canvas はこの外に置く。中の要素の位置は getBoundingClientRect（縮小後の実座標）で取ること。
 */
export const FitStage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [size, setSize] = useState(measure);

  useLayoutEffect(() => {
    const onResize = () => setSize(measure());
    // resize イベントが来ない場面（端末の回転・画面の拡大縮小のエミュレーションなど）も拾えるよう、<html> の大きさも見る
    const ro = new ResizeObserver(onResize);
    ro.observe(document.documentElement);
    window.addEventListener('resize', onResize);
    onResize();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div
      className="absolute top-0 left-0 flex items-center justify-center overflow-hidden"
      style={{
        width: size.w,
        height: size.h,
        transform: size.scale === 1 ? undefined : `scale(${size.scale})`,
        transformOrigin: '0 0',
      }}
    >
      {children}
    </div>
  );
};
