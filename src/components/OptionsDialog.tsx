import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { EffectIntensity, EffectMode, RestMinutes, Settings, VolumeLevel } from '../types';
import { cn } from '../lib/utils';
import { playClickSound } from '../lib/audio';
import { hypeAudio } from '../lib/hype/audio';
import { Button } from './ui/Button';
import { Panel } from './ui/Panel';

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
}

const MODES: { value: EffectMode; label: string; desc: string }[] = [
  { value: 'calm', label: 'ひかえめ', desc: '今までの静かな演出' },
  { value: 'hype', label: 'マシマシ!!', desc: 'ド派手！何をしてもほめまくる' },
];

const INTENSITIES: { value: EffectIntensity; label: string }[] = [
  { value: 'low', label: 'ひかえめ' },
  { value: 'normal', label: 'ふつう' },
  { value: 'max', label: 'MAX' },
];

const RESTS: { value: RestMinutes; label: string }[] = [
  { value: 0, label: 'なし' },
  { value: 15, label: '15分' },
  { value: 30, label: '30分' },
  { value: 45, label: '45分' },
  { value: 60, label: '60分' },
];

const VOLUMES: VolumeLevel[] = [0, 25, 50, 75, 100];
const volumeLabel = (v: VolumeLevel) => (v === 0 ? 'なし' : `${v}%`);

const Row: React.FC<{ title: string; note?: string; children: React.ReactNode; disabled?: boolean }> = ({ title, note, children, disabled }) => (
  <div className={cn('flex flex-col gap-2', disabled && 'opacity-40')}>
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      {note && <span className="text-sm text-gray-300">{note}</span>}
    </div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

export const OptionsDialog: React.FC<Props> = ({ settings, onChange, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hype = settings.effectMode === 'hype';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="オプション"
    >
      <Panel className="w-full max-w-2xl !bg-[#262626] space-y-5 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="mc-title text-2xl text-yellow-400">オプション</h2>
          <Button onClick={onClose} className="w-12 h-12 !p-0" aria-label="閉じる">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <Row title="演出モード">
          {MODES.map((m) => (
            <Button
              key={m.value}
              variant={settings.effectMode === m.value ? (m.value === 'hype' ? 'orange' : 'blue') : 'default'}
              onClick={() => onChange({ effectMode: m.value })}
              className="flex-1 min-w-[200px] h-auto py-3 flex flex-col gap-1"
            >
              <span className="text-xl">{m.label}</span>
              <span className="text-xs opacity-90">{m.desc}</span>
            </Button>
          ))}
        </Row>

        <Row title="演出の強さ" note="ひかえめ：フラッシュ・ゆれ・大きなカットインなし" disabled={!hype}>
          {INTENSITIES.map((i) => (
            <Button
              key={i.value}
              variant={settings.intensity === i.value ? 'green' : 'default'}
              onClick={() => onChange({ intensity: i.value })}
              disabled={!hype}
              className="flex-1 h-12 text-lg"
            >
              {i.label}
            </Button>
          ))}
        </Row>

        {/* 「なし」は BGM オフ（settings.bgm）。それ以外はオンにして大きさを変える */}
        <Row title="BGM の大きさ" note="マシマシモードの音楽" disabled={!hype}>
          {VOLUMES.map((v) => {
            const selected = v === 0 ? !settings.bgm : settings.bgm && settings.bgmVolume === v;
            return (
              <Button
                key={v}
                variant={selected ? 'green' : 'default'}
                onClick={() => onChange(v === 0 ? { bgm: false } : { bgm: true, bgmVolume: v })}
                disabled={!hype}
                className="flex-1 h-12 text-lg"
              >
                {volumeLabel(v)}
              </Button>
            );
          })}
        </Row>

        <Row title="効果音の大きさ" note="ボタン・正解・まちがいの音">
          {VOLUMES.map((v) => (
            <Button
              key={v}
              variant={settings.sfxVolume === v ? 'green' : 'default'}
              onClick={() => {
                onChange({ sfxVolume: v });
                // 新しい大きさがかかってから、ためしに1回鳴らす
                window.setTimeout(() => (hype ? hypeAudio.select() : playClickSound()), 120);
              }}
              className="flex-1 h-12 text-lg"
            >
              {volumeLabel(v)}
            </Button>
          ))}
        </Row>

        <Row title="休けいのお知らせ" note="続けて遊んだ時間がこえたら、プレイの終わりにキャラが声をかける" disabled={!hype}>
          {RESTS.map((r) => (
            <Button
              key={r.value}
              variant={settings.restMinutes === r.value ? 'green' : 'default'}
              onClick={() => onChange({ restMinutes: r.value })}
              disabled={!hype}
              className="flex-1 h-12 text-lg"
            >
              {r.label}
            </Button>
          ))}
        </Row>
      </Panel>
    </motion.div>
  );
};
