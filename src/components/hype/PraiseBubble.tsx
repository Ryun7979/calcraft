import { forwardRef, useImperativeHandle, useRef } from 'react';
import { cn } from '../../lib/utils';

export interface PraiseBubbleHandle {
  /** big = true で大きく、長めに出す */
  say(text: string, big?: boolean): void;
}

/** ブロッくんのふきだし。文字の差し替えとアニメは DOM に直接行う（1操作ごとに React を再描画しない） */
export const PraiseBubble = forwardRef<PraiseBubbleHandle, { className?: string; tail?: 'left' | 'bottom' }>(
  function PraiseBubble({ className, tail = 'left' }, ref) {
    const boxRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const animRef = useRef<Animation | null>(null);

    useImperativeHandle(ref, () => ({
      say(text, big = false) {
        const box = boxRef.current;
        const span = textRef.current;
        if (!box || !span) return;
        span.textContent = text;
        box.dataset.big = big ? '1' : '0';
        animRef.current?.cancel();
        animRef.current = box.animate(
          [
            { opacity: 0, transform: 'scale(0.4) rotate(-6deg)' },
            { opacity: 1, transform: 'scale(1.15) rotate(3deg)', offset: 0.12 },
            { opacity: 1, transform: 'scale(1) rotate(-2deg)', offset: 0.22 },
            { opacity: 1, transform: 'scale(1) rotate(-2deg)', offset: 0.85 },
            { opacity: 0, transform: 'scale(0.9) rotate(-2deg)' },
          ],
          { duration: big ? 1800 : 1100, easing: 'ease-out', fill: 'forwards' },
        );
      },
    }), []);

    return (
      <div ref={boxRef} className={cn('hype-bubble pointer-events-none opacity-0', tail === 'bottom' && 'hype-bubble-bottom', className)}>
        <span ref={textRef} />
      </div>
    );
  },
);
