import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { CHAR_VIEWBOX, CHAR_VIEW, CharDirector, MotionName, renderCharacter } from '../../lib/hype/characters';
import { hypeAudio } from '../../lib/hype/audio';
import { cn } from '../../lib/utils';
import { FxHandle } from './FxCanvas';
import { PixelChar, PixelCharHandle } from './PixelChar';
import { PraiseBubble, PraiseBubbleHandle } from './PraiseBubble';

// 画面下の「たたかいの場」。左にブロッくんとブロッちゃん、右からゾンビが歩いてくる。
// 正解するとヒーローがゾンビをやっつける。ゾンビは React を使わず DOM を直接動かす（rAF）。
// クリックはすべて下へ通す（pointer-events: none）。

export type Mood = 'idle' | 'shout' | 'feverDance' | 'charge';

export interface BattleHandle {
  /** 数字を打った：ヒーローがかわりばんこに反応 */
  key(): void;
  /** 正解：power 体のゾンビをやっつける。big ならふたり同時に攻撃 */
  attack(power: number, big: boolean): void;
  /** まちがい：ヒーローがずっこけ、ゾンビがわらう */
  miss(): void;
  /** ふたりに同じ動き（cheer / jump / count など） */
  play(m: MotionName): void;
  setMood(m: Mood): void;
  /** ふきだし。who を省くとかわりばんこ */
  say(text: string, big?: boolean, who?: 'boy' | 'girl'): void;
  /** 場にいるゾンビの数の目標 */
  setHorde(n: number): void;
  heroCenter(): { x: number; y: number };
}

interface Props {
  fx: React.RefObject<FxHandle | null>;
  className?: string;
  /** ゾンビをやっつけた合計を知らせる */
  onDefeat?: (total: number) => void;
  onShake?: (amp: number) => void;
  /** タイトル画面用：自動で戦い続ける */
  demo?: boolean;
  initialHorde?: number;
  /** 演出の強さ 0〜1（0 で v2 のまま）。キャラのはね方・文字の大きさ */
  power?: number;
}

interface Zombie {
  el: HTMLDivElement;
  g: SVGGElement;
  dir: CharDirector;
  x: number;
  speed: number;
  state: 'walk' | 'hit';
}

const BANGS = ['ドカッ!', 'バキッ!', 'ズドーン!', 'ボコッ!', 'ドーン!', 'ガツン!'];
const SVG_NS = 'http://www.w3.org/2000/svg';
const ASPECT = CHAR_VIEW.w / CHAR_VIEW.h;

export const BattleField = forwardRef<BattleHandle, Props>(function BattleField(
  { fx, className, onDefeat, onShake, demo = false, initialHorde = 1, power = 0 },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const zLayerRef = useRef<HTMLDivElement>(null);
  const boyWrap = useRef<HTMLDivElement>(null);
  const girlWrap = useRef<HTMLDivElement>(null);
  const boy = useRef<PixelCharHandle>(null);
  const girl = useRef<PixelCharHandle>(null);
  const boyBubble = useRef<PraiseBubbleHandle>(null);
  const girlBubble = useRef<PraiseBubbleHandle>(null);
  const st = useRef({
    zombies: [] as Zombie[],
    horde: initialHorde,
    defeated: 0,
    turn: 0,
    sayTurn: 0,
    w: 0,
    h: 0,
    spawnCooldown: 0,
  });
  const cb = useRef({ onDefeat, onShake, power });
  cb.current = { onDefeat, onShake, power };
  /** a（v2）から b（最大）へ power で補間 */
  const pw = (a: number, b: number) => Math.round(a + (b - a) * cb.current.power);

  /** ヒーローがズームアップしてはね、光るふちどりがつく */
  const heroPop = (wrap: HTMLDivElement | null) => {
    const k = cb.current.power;
    if (!wrap || k <= 0) return;
    wrap.animate(
      [
        { scale: '1', translate: '0 0' },
        { scale: String(1 + 0.35 * k), translate: `0 ${-8 * k}%`, offset: 0.3 },
        { scale: '1', translate: '0 0' },
      ],
      { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1.2)' },
    );
    const svg = wrap.querySelector('svg');
    if (svg) {
      svg.classList.add('hype-glow');
      window.setTimeout(() => svg.classList.remove('hype-glow'), 520);
    }
  };

  const heroRight = () => {
    const root = rootRef.current?.getBoundingClientRect();
    const g = girlWrap.current?.getBoundingClientRect();
    return root && g ? g.right - root.left : st.current.w * 0.35;
  };
  const zombieW = () => st.current.h * 0.82 * ASPECT;
  const stopX = (i: number) => heroRight() + zombieW() * (0.05 + i * 0.7);

  const spawn = (atFront = false) => {
    const layer = zLayerRef.current;
    if (!layer) return null;
    const el = document.createElement('div');
    el.className = 'absolute bottom-0 left-0 pointer-events-none';
    el.style.height = '82%';
    el.style.aspectRatio = `${CHAR_VIEW.w} / ${CHAR_VIEW.h}`;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', CHAR_VIEWBOX);
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.overflow = 'visible';
    const g = document.createElementNS(SVG_NS, 'g');
    svg.appendChild(g);
    el.appendChild(svg);
    layer.appendChild(el);
    const s = st.current;
    const z: Zombie = {
      el,
      g,
      dir: new CharDirector('zWalk'),
      // 地面からにょきっと出てくる（画面の右半分のどこか）
      x: atFront ? stopX(0) + 20 : Math.max(stopX(s.zombies.length), s.w * (0.55 + Math.random() * 0.35)),
      speed: (demo ? 140 : 110) + Math.random() * 50,
      state: 'walk',
    };
    s.zombies.push(z);
    el.style.transform = `translateX(${z.x}px)`;
    svg.animate(
      [
        { transform: 'translateY(70%) scaleY(0.6)', opacity: 0 },
        { transform: 'translateY(0) scaleY(1.1)', opacity: 1, offset: 0.7 },
        { transform: 'translateY(0) scaleY(1)', opacity: 1 },
      ],
      { duration: 420, easing: 'ease-out' },
    );
    const c = center(el);
    fx.current?.burst(c.x, c.y + c.h * 0.3, { count: 12, colors: ['#a0693a', '#7a4e2a', '#6abe30'], speed: 5, size: 8 });
    return z;
  };

  const center = (el: Element | null) => {
    const r = el?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.6, h: r.height } : { x: 0, y: 0, h: 0 };
  };

  const defeat = (z: Zombie, delay: number) => {
    window.setTimeout(() => {
      if (!z.el.isConnected) return;
      z.state = 'hit';
      z.dir.play('zHit', performance.now() / 1000);
      const c = center(z.el);
      const f = fx.current;
      f?.ring(c.x, c.y, '#ffffff', pw(180, 300));
      f?.ring(c.x, c.y, '#ffe14d', pw(120, 200));
      f?.bang(BANGS[Math.floor(Math.random() * BANGS.length)], c.x + 30, c.y - pw(80, 110), '#ff5a5a', pw(52, 88));
      f?.burst(c.x, c.y, { count: pw(40, 80), colors: ['#4fb03c', '#7fd86c', '#2f7d26', '#ffffff', '#ffe14d'], speed: pw(11, 15), size: pw(12, 16) });
      f?.flash('#ffffff', 0.18, 100);
      hypeAudio.hit();
      cb.current.onShake?.(pw(10, 18));
      // ふっとんで、ドットになって消える
      window.setTimeout(() => {
        const c2 = center(z.el);
        z.el.animate(
          [
            { transform: `translateX(${z.x}px) translate(0,0) rotate(0deg)`, opacity: 1 },
            { transform: `translateX(${z.x}px) translate(${st.current.w * 0.35}px, ${-st.current.h * 1.6}px) rotate(900deg) scale(0.4)`, opacity: 0.2 },
          ],
          { duration: 650, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' },
        );
        f?.burst(c2.x, c2.y, { count: 30, colors: ['#4fb03c', '#ffffff', '#ffe14d', '#ff8fb1'], speed: 8, size: 10 });
        f?.popText('やっつけた!', c2.x, c2.y - pw(120, 150), '#7dff6a', pw(34, 56));
        window.setTimeout(() => {
          z.el.remove();
          st.current.zombies = st.current.zombies.filter((q) => q !== z);
        }, 680);
      }, 260);
      st.current.defeated += 1;
      cb.current.onDefeat?.(st.current.defeated);
    }, delay);
  };

  const api: BattleHandle = {
    key() {
      const s = st.current;
      s.turn++;
      (s.turn % 2 ? boy : girl).current?.play('count');
    },
    attack(power, big) {
      const s = st.current;
      let targets = s.zombies.filter((z) => z.state === 'walk').sort((a, b) => a.x - b.x);
      if (targets.length === 0) {
        const z = spawn(true);
        if (z) targets = [z];
      }
      targets = targets.slice(0, Math.max(1, power));
      const first = targets[0];
      s.turn++;
      const useBoy = big || s.turn % 2 === 1;
      const useGirl = big || s.turn % 2 === 0;
      if (useBoy && first && boyWrap.current) {
        const br = boyWrap.current.getBoundingClientRect();
        const cell = br.height / CHAR_VIEW.h;
        const shoulderX = br.left + br.width / 2 + 5 * cell;
        const zr = first.el.getBoundingClientRect();
        const reach = (zr.left + zr.width * 0.35 - shoulderX) / cell;
        boy.current?.play('punch', Math.max(6, Math.min(140, reach)));
        heroPop(boyWrap.current);
        hypeAudio.punch();
      } else if (!useBoy) {
        boy.current?.play('cheer');
      }
      if (useGirl && girlWrap.current) {
        girl.current?.play('beam');
        heroPop(girlWrap.current);
        hypeAudio.beam();
        window.setTimeout(() => {
          const gr = girlWrap.current?.getBoundingClientRect();
          if (!gr) return;
          const hx = gr.left + gr.width * 0.72;
          const hy = gr.top + gr.height * 0.62;
          for (const z of targets) {
            const c = center(z.el);
            fx.current?.beam(hx, hy, c.x, c.y);
          }
        }, 150);
      } else {
        girl.current?.play('cheer');
      }
      targets.forEach((z, i) => defeat(z, 200 + i * 70));
      s.spawnCooldown = 0.6;
    },
    miss() {
      const s = st.current;
      s.turn++;
      (s.turn % 2 ? boy : girl).current?.play('trip');
      (s.turn % 2 ? girl : boy).current?.play('cheer');
      const front = s.zombies.filter((z) => z.state === 'walk').sort((a, b) => a.x - b.x)[0];
      if (front) {
        front.dir.play('zTaunt', performance.now() / 1000);
        const c = center(front.el);
        fx.current?.bang('ゾンゾ〜ン♪', c.x, c.y - 120, '#b0e080', pw(34, 50));
      }
    },
    play(m) {
      boy.current?.play(m);
      window.setTimeout(() => girl.current?.play(m), 90);
    },
    setMood(m) {
      boy.current?.setBase(m);
      girl.current?.setBase(m);
      // FEVER 中は虹のオーラ
      const aura = m === 'feverDance' && cb.current.power > 0;
      boyWrap.current?.classList.toggle('hype-aura', aura);
      girlWrap.current?.classList.toggle('hype-aura', aura);
    },
    say(text, big = false, who) {
      const s = st.current;
      const speaker = who ?? (s.sayTurn++ % 2 ? 'girl' : 'boy');
      (speaker === 'boy' ? boyBubble : girlBubble).current?.say(text, big);
    },
    setHorde(n) {
      st.current.horde = n;
    },
    heroCenter() {
      const r = rootRef.current?.getBoundingClientRect();
      return r ? { x: r.left + r.width * 0.15, y: r.top + r.height * 0.5 } : { x: 0, y: 0 };
    },
  };
  const apiRef = useRef(api);
  apiRef.current = api;

  useImperativeHandle(ref, () => ({
    key: () => apiRef.current.key(),
    attack: (p, b) => apiRef.current.attack(p, b),
    miss: () => apiRef.current.miss(),
    play: (m) => apiRef.current.play(m),
    setMood: (m) => apiRef.current.setMood(m),
    say: (t, b, w) => apiRef.current.say(t, b, w),
    setHorde: (n) => apiRef.current.setHorde(n),
    heroCenter: () => apiRef.current.heroCenter(),
  }), []);

  // 大きさ・ゾンビの歩きと補充
  useEffect(() => {
    const root = rootRef.current!;
    const s = st.current;
    const ro = new ResizeObserver(() => {
      s.w = root.clientWidth;
      s.h = root.clientHeight;
    });
    ro.observe(root);
    s.w = root.clientWidth;
    s.h = root.clientHeight;

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const walkers = s.zombies.filter((z) => z.state === 'walk').sort((a, b) => a.x - b.x);
      walkers.forEach((z, i) => {
        const target = stopX(i);
        if (z.x > target) z.x = Math.max(target, z.x - z.speed * dt);
        else if (z.x < target - 2) z.x = Math.min(target, z.x + z.speed * dt * 0.5);
      });
      for (const z of s.zombies) {
        if (z.state === 'walk') z.el.style.transform = `translateX(${z.x}px)`;
        z.g.innerHTML = renderCharacter('zombie', z.dir.pose(now / 1000));
      }
      s.spawnCooldown -= dt;
      if (walkers.length < s.horde && s.spawnCooldown <= 0) {
        spawn();
        s.spawnCooldown = 0.35;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    let demoTimer = 0;
    if (demo) {
      demoTimer = window.setInterval(() => {
        apiRef.current.attack(Math.random() < 0.25 ? 2 : 1, Math.random() < 0.3);
      }, 2300);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (demoTimer) window.clearInterval(demoTimer);
      s.zombies.forEach((z) => z.el.remove());
      s.zombies = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  return (
    <div ref={rootRef} className={cn('relative pointer-events-none', className)} style={{ containerType: 'size' }}>
      {/* 地面（草ブロックの帯） */}
      <div className="absolute left-0 right-0 bottom-0 h-[6%] hype-ground" />
      <div ref={zLayerRef} className="absolute inset-0" />
      <div ref={boyWrap} className="absolute bottom-0 left-[1%] h-full origin-bottom" style={{ aspectRatio: `${CHAR_VIEW.w} / ${CHAR_VIEW.h}` }}>
        <PixelChar ref={boy} who="boy" className="w-full h-full" />
        <div className="absolute left-1/2 bottom-[66%] -translate-x-1/2">
          <PraiseBubble ref={boyBubble} tail="bottom" />
        </div>
      </div>
      <div
        ref={girlWrap}
        className="absolute bottom-0 h-full origin-bottom"
        style={{ aspectRatio: `${CHAR_VIEW.w} / ${CHAR_VIEW.h}`, left: `calc(1% + ${0.72 * ASPECT * 100}cqh)` }}
      >
        <PixelChar ref={girl} who="girl" className="w-full h-full" />
        <div className="absolute left-1/2 bottom-[66%] -translate-x-1/2">
          <PraiseBubble ref={girlBubble} tail="bottom" />
        </div>
      </div>
    </div>
  );
});
