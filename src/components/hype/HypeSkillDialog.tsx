import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { X, RotateCcw, Check, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { FxHandle } from './FxCanvas';
import { BRANCHES, canLearn, forgetSkill, levelInfo, SKILLS, skillById, SkillId, skillPoints } from '../../lib/hype/skills';
import { Progress } from '../../lib/storage';
import { hypeAudio } from '../../lib/hype/audio';

// スキルツリー。レベルアップでもらったポイントでスキルを取る。振り直しは無料（いつでも外せる）。

interface Props {
  progress: Progress;
  updateProgress: (fn: (p: Progress) => void) => void;
  fx: React.RefObject<FxHandle | null>;
  /** スキルを取ったときにキャラにほめさせる */
  onLearn: (name: string) => void;
  onClose: () => void;
}

const BRANCH_COLOR: Record<string, string> = {
  boost: 'text-orange-300',
  show: 'text-pink-300',
  play: 'text-cyan-300',
};

export const HypeSkillDialog: React.FC<Props> = ({ progress, updateProgress, fx, onLearn, onClose }) => {
  const { xp, skills } = progress;
  const info = levelInfo(xp);
  const points = skillPoints(xp, skills);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const learn = (id: SkillId, e: React.MouseEvent) => {
    if (!canLearn(id, xp, skills)) return;
    updateProgress((p) => {
      p.skills = [...p.skills, id];
    });
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    hypeAudio.levelUp();
    fx.current?.burst(x, y, { count: 60, speed: 10, size: 10 });
    fx.current?.ring(x, y, '#ffe14d', 200);
    fx.current?.firework(x, y - 40);
    onLearn(skillById(id).name);
  };

  const forget = (id: SkillId) => {
    hypeAudio.erase();
    updateProgress((p) => {
      p.skills = forgetSkill(id, p.skills);
    });
  };

  const resetAll = () => {
    if (!skills.length) return;
    hypeAudio.erase();
    updateProgress((p) => {
      p.skills = [];
    });
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
      aria-label="スキル"
    >
      <Panel className="w-full max-w-5xl !bg-[#262626] space-y-3 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="mc-title text-2xl text-yellow-400">スキル</h2>
          <div className="flex items-center gap-3 text-lg font-bold">
            <span className="text-white">Lv {info.level}</span>
            <span className={cn('hype-golden-tag px-3 py-0.5 whitespace-nowrap', points <= 0 && 'opacity-50')}>スキルポイント {Math.max(0, points)}</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={resetAll} disabled={!skills.length} className="h-12 !px-3 text-base flex items-center gap-1 whitespace-nowrap">
              <RotateCcw className="w-5 h-5" />
              ぜんぶ振り直す
            </Button>
            <Button onClick={onClose} className="w-12 h-12 !p-0" aria-label="閉じる">
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-300">
          レベルが1つ上がるごとにスキルポイントが1つ。取ったスキルをもう一度押すと外せるよ（ポイントは戻る）。
        </p>

        <div className="grid grid-cols-3 gap-3">
          {BRANCHES.map((b) => (
            <div key={b.id} className="flex flex-col gap-2">
              <div className="text-center">
                <div className={cn('text-xl font-bold', BRANCH_COLOR[b.id])}>{b.name}</div>
                <div className="text-xs text-gray-400">{b.desc}</div>
              </div>
              {SKILLS.filter((s) => s.branch === b.id).map((s) => {
                const learned = skills.includes(s.id);
                const ok = canLearn(s.id, xp, skills);
                const locked = !!s.needs && !skills.includes(s.needs);
                return (
                  <Button
                    key={s.id}
                    variant={learned ? 'green' : ok ? 'orange' : 'default'}
                    onClick={(e) => (learned ? forget(s.id) : learn(s.id, e))}
                    disabled={!learned && !ok}
                    className={cn('h-auto !py-2 !px-3 flex-col !items-start gap-0.5 text-left', s.needs && 'ml-5', ok && 'hype-start', !learned && !ok && 'opacity-60 cursor-default')}
                  >
                    <span className="text-base font-bold flex items-center gap-1">
                      {learned ? <Check className="w-4 h-4" /> : locked ? <Lock className="w-4 h-4" /> : null}
                      {s.name}
                    </span>
                    <span className="text-xs opacity-90 normal-case">{s.desc}</span>
                    {locked && <span className="text-xs text-yellow-200">先に「{skillById(s.needs!).name}」</span>}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      </Panel>
    </motion.div>
  );
};
