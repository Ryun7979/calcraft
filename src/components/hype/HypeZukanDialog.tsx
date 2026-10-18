import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Check, Music, Gem } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { FxHandle } from './FxCanvas';
import { PixelChar, PixelCharHandle } from './PixelChar';
import { CHAR_VIEWBOX, neutralPose, renderCharacter } from '../../lib/hype/characters';
import { Category, CATEGORIES, collectionCount, exchangeShards, getEquipped, isOwned, Item, ITEMS } from '../../lib/hype/collection';
import { RULES } from '../../lib/hype/rules';
import { hypeAudio } from '../../lib/hype/audio';
import { Progress } from '../../lib/storage';

// 図鑑。持っているものは押すと装備して、その場で試せる。持っていないものは影（シルエット）だけ。
// かけらが RULES.gacha.shardsPerItem 個あれば、持っていないものを1つえらんで交換できる。

/** アイテムの絵（図鑑・ガチャの結果で使う）。silhouette なら影だけ */
export const ItemIcon: React.FC<{ item: Item; className?: string; silhouette?: boolean }> = ({ item, className, silhouette }) => {
  const body = useMemo(() => {
    if (item.category !== 'costume') return null;
    const pose = neutralPose();
    return { boy: renderCharacter('boy', pose, item.costume ?? {}), girl: renderCharacter('girl', pose, item.costume ?? {}) };
  }, [item]);
  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden', silhouette && 'hype-silhouette', className)}>
      {body && (
        <div className="flex items-end h-full py-1">
          <svg viewBox={CHAR_VIEWBOX} shapeRendering="crispEdges" className="h-full w-auto overflow-visible" dangerouslySetInnerHTML={{ __html: body.boy }} />
          <svg viewBox={CHAR_VIEWBOX} shapeRendering="crispEdges" className="h-full w-auto overflow-visible -ml-[18%]" dangerouslySetInnerHTML={{ __html: body.girl }} />
        </div>
      )}
      {item.category === 'effect' && (
        <div className="grid grid-cols-3 gap-1 p-1">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="w-4 h-4 border-2 border-black/60" style={{ background: item.colors?.[(i * 2) % (item.colors?.length ?? 1)] }} />
          ))}
        </div>
      )}
      {item.category === 'sound' && (
        <div className="flex flex-col items-center text-white">
          <Music className="w-10 h-10" />
          <span className="text-xs font-bold">{item.sound?.wave}</span>
        </div>
      )}
      {item.category === 'bg' && (
        <div className="absolute inset-1 bg-stone border-2 border-black/60">
          {item.bgClass && <div className={cn('absolute inset-0', item.bgClass)} />}
        </div>
      )}
    </div>
  );
};

export const RarityTag: React.FC<{ rarity: Item['rarity']; className?: string }> = ({ rarity, className }) => (
  <span className={cn('px-1.5 text-xs font-black border-2 border-black leading-tight', rarity ? `hype-rarity-${rarity}` : 'bg-stone-600 text-white', className)}>
    {rarity ?? 'はじめ'}
  </span>
);

interface Props {
  progress: Progress;
  updateProgress: (fn: (p: Progress) => void) => void;
  fx: React.RefObject<FxHandle | null>;
  onClose: () => void;
}

export const HypeZukanDialog: React.FC<Props> = ({ progress, updateProgress, fx, onClose }) => {
  const [cat, setCat] = useState<Category>('costume');
  const boyRef = useRef<PixelCharHandle>(null);
  const girlRef = useRef<PixelCharHandle>(null);
  const owned = progress.items;
  const equipped = getEquipped(progress.equipped, owned, cat);
  const bg = getEquipped(progress.equipped, owned, 'bg');
  const canExchange = progress.shards >= RULES.gacha.shardsPerItem;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** その場で試す（装備した直後） */
  const tryOut = (item: Item, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    if (item.category === 'effect') {
      fx.current?.burst(x, y, { count: 60, speed: 10, size: 10, colors: item.colors });
      fx.current?.ring(x, y, item.colors?.[0] ?? '#ffffff', 160);
    } else if (item.category === 'sound' && item.sound) {
      hypeAudio.sample(item.sound);
    } else {
      fx.current?.burst(x, y, { count: 30, speed: 7, size: 8 });
    }
    if (item.category !== 'sound') hypeAudio.select();
    boyRef.current?.play('jump');
    window.setTimeout(() => girlRef.current?.play('cheer'), 120);
  };

  const equip = (item: Item, e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    updateProgress((p) => {
      p.equipped = { ...p.equipped, [item.category]: item.id };
    });
    tryOut(item, el);
  };

  const exchange = (item: Item, e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    let ok = false;
    updateProgress((p) => {
      ok = exchangeShards(p, item.id);
      if (ok) p.equipped = { ...p.equipped, [item.category]: item.id };
    });
    if (!ok) return;
    hypeAudio.gachaReveal(2);
    const r = el.getBoundingClientRect();
    fx.current?.firework(r.left + r.width / 2, r.top);
    tryOut(item, el);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="ずかん"
    >
      <Panel className="w-full max-w-6xl !bg-[#262626] space-y-3 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="mc-title text-2xl text-yellow-400">ずかん</h2>
          <div className="flex items-center gap-3 text-lg font-bold">
            <span className="text-white">
              あつめた <span className="text-yellow-300 text-2xl">{collectionCount(owned)}</span>/{ITEMS.length}
            </span>
            <span className={cn('hype-golden-tag px-3 py-0.5 whitespace-nowrap flex items-center gap-1', !canExchange && 'opacity-60')}>
              <Gem className="w-4 h-4" />
              かけら {progress.shards}/{RULES.gacha.shardsPerItem}
            </span>
          </div>
          <Button onClick={onClose} className="w-12 h-12 !p-0" aria-label="閉じる">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <Button
              key={c.id}
              variant={cat === c.id ? 'blue' : 'default'}
              onClick={() => {
                hypeAudio.select();
                setCat(c.id);
              }}
              className="h-12 text-xl whitespace-nowrap"
            >
              {c.name}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,5fr)] gap-3">
          {/* 試着：ふたりが今の装備で動く */}
          <div className="relative border-4 border-black min-h-[300px] overflow-hidden bg-stone">
            {bg.bgClass && <div className={cn('absolute inset-0', bg.bgClass)} />}
            <div className="absolute inset-x-4 bottom-3 top-12 flex items-end justify-center gap-2">
              {/* SVG の枠はキャラより広い（パンチの腕の分）ので、重ねて並べる */}
              <PixelChar ref={boyRef} who="boy" initial="feverDance" className="h-[62%] aspect-[40/42] -mr-[18%]" />
              <PixelChar ref={girlRef} who="girl" initial="feverDance" className="h-[62%] aspect-[40/42] -ml-[18%]" />
            </div>
            <div className="absolute top-2 inset-x-2 text-center text-sm font-bold text-white bg-black/60 py-1">
              そうび中：{equipped.name}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {ITEMS.filter((x) => x.category === cat).map((item) => {
              const have = isOwned(owned, item.id);
              const on = equipped.id === item.id;
              return (
                <div
                  key={item.id}
                  className={cn('mc-panel !p-2 flex flex-col gap-1 items-center', on ? '!border-yellow-300 !bg-yellow-900/40' : '!bg-black/40')}
                >
                  <button
                    type="button"
                    disabled={!have}
                    onClick={(e) => equip(item, e)}
                    className={cn('w-full h-24 bg-black/40 border-2 border-black/60', have ? 'cursor-pointer hover:brightness-125' : 'cursor-default')}
                    aria-label={have ? `${item.name}をそうびする` : 'まだ持っていない'}
                  >
                    <ItemIcon item={item} silhouette={!have} className="w-full h-full" />
                  </button>
                  <div className="flex items-center gap-1 w-full justify-center">
                    <RarityTag rarity={item.rarity} />
                    <span className="text-base font-bold text-white truncate">{have ? item.name : '？？？'}</span>
                  </div>
                  {have ? (
                    <span className={cn('text-xs', on ? 'text-yellow-300 font-bold flex items-center gap-1' : 'text-gray-300')}>
                      {on ? (
                        <>
                          <Check className="w-3 h-3" />
                          そうび中
                        </>
                      ) : (
                        item.desc
                      )}
                    </span>
                  ) : canExchange ? (
                    <Button variant="green" onClick={(e) => exchange(item, e)} className="h-8 !px-2 text-sm whitespace-nowrap">
                      かけら{RULES.gacha.shardsPerItem}で交換
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-400">ガチャで出るよ</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
    </motion.div>
  );
};
