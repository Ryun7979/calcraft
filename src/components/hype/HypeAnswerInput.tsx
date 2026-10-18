import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';

// マシマシモードの入力欄。聖域「入力の正確さ」をここで守る。
// - 正解・不正解の表示中（locked）に打った数字は捨てずにためて、次の問題の入力欄に入れる
// - 入力欄の外で数字を打っても、自分で入力欄に足す（フォーカス移動のタイミングに頼らない）
// - 演出レイヤーはすべて pointer-events: none なので、クリック・フォーカスを奪われない

const MAX_DIGITS = 6;
const toHalf = (s: string) => s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
const digitsOnly = (s: string) => toHalf(s).replace(/\D/g, '').slice(0, MAX_DIGITS);
const BLOCKED_KEYS = new Set(['e', 'E', '+', '-', '.', ',']);

interface Props {
  /** 問題が変わったら変わる値（currentIndex） */
  questionKey: number;
  hasRemainder: boolean;
  /** カウントダウン中など、まだ入力を受け付けない */
  active: boolean;
  /** 正解・不正解の表示中。打った数字は次の問題へ持ちこす */
  locked: boolean;
  onDigit: (ch: string, el: HTMLElement | null) => void;
  onErase: (el: HTMLElement | null) => void;
  onSubmit: (val: string, rem: string) => void;
  /** こたえるボタンの横にならべるボタン（ヒント・パス） */
  extra?: React.ReactNode;
}

export const HypeAnswerInput: React.FC<Props> = ({ questionKey, hasRemainder, active, locked, onDigit, onErase, onSubmit, extra }) => {
  const [val, setVal] = useState('');
  const [remVal, setRemVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const remRef = useRef<HTMLInputElement>(null);
  const pending = useRef('');
  const live = useRef({ val, remVal, active, locked, hasRemainder, onDigit, onErase, onSubmit });
  live.current = { val, remVal, active, locked, hasRemainder, onDigit, onErase, onSubmit };

  // 問題が変わったら、ためておいた数字を入れてフォーカス
  useEffect(() => {
    setVal(pending.current);
    setRemVal('');
    pending.current = '';
    inputRef.current?.focus();
  }, [questionKey]);

  useEffect(() => {
    if (active && !locked) inputRef.current?.focus();
  }, [active, locked]);

  const submit = () => {
    const L = live.current;
    if (!L.active || L.locked) return;
    if (L.val.trim() === '' || (L.hasRemainder && L.remVal.trim() === '')) return;
    L.onSubmit(L.val, L.remVal);
  };

  // 入力欄の外・ロック中のキー入力
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const L = live.current;
      if (!L.active || e.isComposing) return;
      const isOurs = e.target === inputRef.current || e.target === remRef.current;
      const ch = toHalf(e.key);
      const isDigit = /^[0-9]$/.test(ch);

      if (L.locked) {
        if (isDigit) {
          e.preventDefault();
          if (pending.current.length < MAX_DIGITS) {
            pending.current += ch;
            L.onDigit(ch, inputRef.current);
          }
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          if (pending.current.length > 0) {
            pending.current = pending.current.slice(0, -1);
            L.onErase(inputRef.current);
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
        }
        return;
      }

      if (isOurs) return; // 入力欄の中は onChange / onKeyDown にまかせる
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (isDigit) {
        e.preventDefault();
        if (L.val.length < MAX_DIGITS) {
          setVal(L.val + ch);
          L.onDigit(ch, inputRef.current);
        }
        inputRef.current?.focus();
      } else if (e.key === 'Enter' && (e.target as HTMLElement | null)?.tagName !== 'BUTTON') {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const change = (which: 'val' | 'rem') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const L = live.current;
    if (!L.active || L.locked) return;
    const prev = which === 'val' ? L.val : L.remVal;
    const next = digitsOnly(e.target.value);
    if (which === 'val') setVal(next);
    else setRemVal(next);
    if (next.length > prev.length) {
      for (const ch of next.slice(prev.length)) L.onDigit(ch, e.target);
    } else if (next.length < prev.length) {
      L.onErase(e.target);
    }
  };

  const keyDown = (which: 'val' | 'rem') => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (BLOCKED_KEYS.has(e.key)) {
      e.preventDefault();
      return;
    }
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    const L = live.current;
    if (which === 'val' && L.hasRemainder) {
      remRef.current?.focus();
      return;
    }
    submit();
  };

  const canSubmit = active && !locked && val.trim() !== '' && (!hasRemainder || remVal.trim() !== '');

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="flex items-center gap-3 w-full max-w-2xl justify-center">
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          autoComplete="off"
          value={val}
          onChange={change('val')}
          onKeyDown={keyDown('val')}
          readOnly={!active || locked}
          data-testid="hype-answer"
          className={`${hasRemainder ? 'w-1/2' : 'w-full'} hype-input hype-no-spin px-4 py-2 text-5xl md:text-6xl font-bold text-center`}
          placeholder="?"
        />
        {hasRemainder && (
          <>
            <span className="text-2xl md:text-3xl font-bold text-yellow-400 mc-title whitespace-nowrap">あまり</span>
            <input
              ref={remRef}
              type="number"
              inputMode="numeric"
              autoComplete="off"
              value={remVal}
              onChange={change('rem')}
              onKeyDown={keyDown('rem')}
              readOnly={!active || locked}
              data-testid="hype-remainder"
              className="w-1/3 hype-input hype-no-spin px-3 py-2 text-5xl md:text-6xl font-bold text-center"
              placeholder="?"
            />
          </>
        )}
      </div>
      <div className="flex items-center gap-3 w-full max-w-2xl">
        <Button variant="green" onClick={submit} disabled={!canSubmit} className="text-3xl h-14 flex-1">
          こたえる！
        </Button>
        {extra}
      </div>
    </div>
  );
};
