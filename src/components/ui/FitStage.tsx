import React, { useLayoutEffect, useState } from 'react';

/** いつもこの大きさ（FHD・16:9）の「仮の画面」に描き、ウィンドウに収まるように拡大・縮小する */
export const STAGE_W = 1920;
export const STAGE_H = 1080;

const measure = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // 縦横の比を保ったまま、ウィンドウに収まる最大の倍率。あまった部分は外側の背景になる
  // 大きさ 0（非表示のタブなど）のときは 0 で割らないように等倍にする
  const scale = w > 0 && h > 0 ? Math.min(w / STAGE_W, h / STAGE_H) : 1;
  return { scale, left: (w - STAGE_W * scale) / 2, top: (h - STAGE_H * scale) / 2 };
};

/**
 * 画面の中身を 1920×1080 の仮の画面に描き、ウィンドウに合わせてまるごと拡大・縮小する入れ物（docs/issues.md #4・#14）。
 * 背景と演出の Canvas はこの外に置く。中の要素の位置は getBoundingClientRect（縮小後の実座標）で取ること。
 * 中では vh・vw ではなく、仮の画面に対する cqh・cqw を使う（container-type: size）。
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
      className="absolute flex items-center justify-center overflow-hidden"
      style={{
        left: size.left,
        top: size.top,
        width: STAGE_W,
        height: STAGE_H,
        containerType: 'size',
        transform: size.scale === 1 ? undefined : `scale(${size.scale})`,
        transformOrigin: '0 0',
      }}
    >
      {children}
    </div>
  );
};
