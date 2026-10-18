import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { CHAR_VIEWBOX, CharDirector, CharacterId, MotionName, renderCharacter } from '../../lib/hype/characters';
import { cn } from '../../lib/utils';

export interface PixelCharHandle {
  /** 1回だけの動き（cheer / jump / trip / count / punch …）。くり返しの動きなら base を切り替える */
  play(m: MotionName, param?: number): void;
  setBase(m: MotionName): void;
}

interface Props {
  who: CharacterId;
  className?: string;
  initial?: MotionName;
  /** 左右反転 */
  flip?: boolean;
}

/** ドットのキャラ1体。pose は rAF で描き直し、React の再描画には乗せない */
export const PixelChar = forwardRef<PixelCharHandle, Props>(function PixelChar({ who, className, initial = 'idle', flip }, ref) {
  const gRef = useRef<SVGGElement>(null);
  const director = useRef(new CharDirector(initial as MotionName));

  useImperativeHandle(ref, () => ({
    play: (m, param) => director.current.play(m, performance.now() / 1000, param),
    setBase: (m) => director.current.setBase(m, performance.now() / 1000),
  }), []);

  useEffect(() => {
    let raf = 0;
    const frame = (now: number) => {
      if (gRef.current) gRef.current.innerHTML = renderCharacter(who, director.current.pose(now / 1000));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [who]);

  return (
    <svg
      viewBox={CHAR_VIEWBOX}
      shapeRendering="crispEdges"
      className={cn('pointer-events-none overflow-visible', className)}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden
    >
      <g ref={gRef} />
    </svg>
  );
});
