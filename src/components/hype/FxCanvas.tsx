import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { INTENSITY, IntensityProfile, RULES } from '../../lib/hype/rules';
import { glyphImage, preloadHypeImages, SpriteName, spriteImage, uiImage } from '../../lib/hype/assets';

// 演出用の Canvas。画面全体に重ね、クリックは下へ通す（pointer-events: none）。
// React の再描画には乗せず、ref の命令で描く。座標はウィンドウ座標（getBoundingClientRect の値をそのまま使える）。

export interface BurstOptions {
  count?: number;
  colors?: string[];
  speed?: number;
  size?: number;
  gravity?: number;
  life?: number;
  /** 絵の粒（星・ハートなど）。省略すると星とキラキラを少しまぜる。[] で絵なし */
  sprites?: readonly SpriteName[];
  /** 絵の粒の割合 0〜1 */
  spriteRate?: number;
}

/** 何も指定しないときにまぜる絵の粒 */
const DEFAULT_SPRITES: readonly SpriteName[] = ['star', 'sparkle'];
const CONFETTI_SPRITES: readonly SpriteName[] = ['heart', 'star', 'note', 'diamond', 'emerald', 'coin'];

export interface FxHandle {
  burst(x: number, y: number, opts?: BurstOptions): void;
  firework(x: number, y: number, hue?: number): void;
  confetti(count?: number): void;
  /** strong = true のフラッシュは、弱いフラッシュで上書きしない */
  flash(color: string, alpha: number, ms: number, strong?: boolean): void;
  /** 操作した文字のコピーが画面外へ飛んでいく */
  flyText(text: string, x: number, y: number, color?: string, size?: number): void;
  /** その場でポンとはねて消える文字（+5 など） */
  popText(text: string, x: number, y: number, color?: string, size?: number): void;
  /** 集中線の強さ 0〜1 */
  setSpeedLines(level: number): void;
  /** FEVER のふちのネオン。stage = -1 で消す */
  setFever(stage: number): void;
  /** FEVER 突入の「暗転＋虹の放射線が収束」 */
  converge(ms: number): void;
  /** 衝撃波の輪 */
  ring(x: number, y: number, color?: string, maxR?: number): void;
  /** (x1,y1) から (x2,y2) へ星のビーム */
  beam(x1: number, y1: number, x2: number, y2: number): void;
  /** マンガの「ドカッ!」のようなギザギザの吹き出し文字 */
  bang(text: string, x: number, y: number, color?: string, size?: number): void;
  setIntensity(p: IntensityProfile): void;
  /** 花火にまぜる形（スキル「ほし花火」「ハート花火」）。空ならいつもの丸 */
  setFireworkShapes(shapes: readonly FireworkShape[]): void;
  /** パーティクル・紙ふぶきの色（ガチャの「エフェクト」）。null でいつもの色 */
  setPalette(colors: readonly string[] | null): void;
  clear(): void;
}

export type FireworkShape = 'star' | 'heart';

/** 形の花火の速度（t = 0〜1 で一周）。大きさはだいたい 1 */
const shapeVec = (shape: FireworkShape, t: number): [number, number] => {
  if (shape === 'heart') {
    const a = t * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(a), 3);
    const y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    return [x / 16, y / 16];
  }
  // 星：外側と内側の頂点（10個）を直線でつなぐ
  const k = t * 10;
  const i = Math.floor(k);
  const f = k - i;
  const pt = (j: number): [number, number] => {
    const r = j % 2 ? 0.45 : 1;
    const a = -Math.PI / 2 + (j * Math.PI) / 5;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  const [x1, y1] = pt(i);
  const [x2, y2] = pt(i + 1);
  return [x1 + (x2 - x1) * f, y1 + (y2 - y1) * f];
};

interface Ring {
  x: number;
  y: number;
  r: number;
  max: number;
  life: number;
  total: number;
  color: string;
}

interface Bang {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  total: number;
  rot: number;
}

interface Beam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  total: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  size: number;
  color: string;
  life: number;
  max: number;
  text?: string;
  font?: number;
  /** 文字のとき：true ならポンと大きくなって消える */
  pop?: boolean;
  /** 絵の粒のとき：絵・回転・回転の速さ */
  sprite?: SpriteName;
  rot?: number;
  vr?: number;
}

const PALETTE = {
  pixel: ['#ffe14d', '#6abe30', '#3aa0e8', '#ff8fb1', '#ffffff', '#ffb84d'],
  rainbow: ['#ff4d4d', '#ffb84d', '#fff14d', '#5dff6a', '#4dd2ff', '#b44dff'],
};

export const FxCanvas = forwardRef<FxHandle>(function FxCanvas(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const st = useRef({
    parts: [] as Particle[],
    rings: [] as Ring[],
    bangs: [] as Bang[],
    beams: [] as Beam[],
    intensity: INTENSITY.max as IntensityProfile,
    flash: { color: '#fff', alpha: 0, start: 0, ms: 1, strong: false },
    speedLines: 0,
    fever: -1,
    shapes: [] as readonly FireworkShape[],
    palette: null as readonly string[] | null,
    converge: { start: 0, ms: 0 },
    w: 0,
    h: 0,
  });

  useImperativeHandle(ref, () => {
    const s = st.current;
    const cap = () => (s.fever >= 0 ? RULES.particles.capFever : RULES.particles.cap);
    const push = (p: Particle) => {
      if (s.parts.length >= cap()) s.parts.shift();
      s.parts.push(p);
    };
    const scaled = (n: number) => Math.max(1, Math.round(n * s.intensity.particles));

    const api: FxHandle = {
      burst(x, y, o = {}) {
        const n = scaled(o.count ?? 16);
        const colors = o.colors ?? s.palette ?? PALETTE.pixel;
        const sprites = o.sprites ?? DEFAULT_SPRITES;
        const rate = sprites.length ? (o.spriteRate ?? (o.sprites ? 0.4 : 0.2)) : 0;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = (o.speed ?? 6) * (0.4 + Math.random() * 0.8);
          const life = (o.life ?? 0.8) * (0.7 + Math.random() * 0.6);
          const sprite = Math.random() < rate ? sprites[i % sprites.length] : undefined;
          push({
            x,
            y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - 2,
            g: o.gravity ?? 0.25,
            size: Math.round((o.size ?? 8) * (0.6 + Math.random() * 0.8)),
            color: colors[i % colors.length],
            life: sprite ? life * 1.3 : life,
            max: sprite ? life * 1.3 : life,
            sprite,
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.3,
          });
        }
      },
      firework(x, y, hue) {
        const colors =
          hue === undefined
            ? PALETTE.rainbow
            : [`hsl(${hue},100%,60%)`, `hsl(${hue + 30},100%,70%)`, '#ffffff'];
        // 形の花火（2回に1回くらい）は、形がくずれないように重力を弱く・速さをそろえる
        const shape = s.shapes.length && Math.random() < 0.5 ? s.shapes[Math.floor(Math.random() * s.shapes.length)] : null;
        const n = scaled(shape ? 56 : 40);
        for (let i = 0; i < n; i++) {
          if (shape) {
            const [ux, uy] = shapeVec(shape, i / n);
            const color = shape === 'heart' ? (i % 3 ? '#ff6f9f' : '#ffffff') : colors[i % colors.length];
            push({ x, y, vx: ux * 9, vy: uy * 9, g: 0.03, size: 7, color, life: 1.2, max: 1.2 });
            continue;
          }
          const a = (i / n) * Math.PI * 2;
          const sp = 7 + Math.random() * 3;
          // 5つに1つはキラキラの絵（外側へ大きく飛ぶ）
          const sprite: SpriteName | undefined = i % 5 === 0 ? (i % 10 === 0 ? 'sparkle' : 'star') : undefined;
          push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.12, size: 7, color: colors[i % colors.length], life: 1.1, max: 1.1, sprite, rot: a, vr: 0.08 });
        }
      },
      confetti(count = 80) {
        const n = scaled(count);
        for (let i = 0; i < n; i++) {
          push({
            x: Math.random() * s.w,
            y: -20 - Math.random() * 200,
            vx: (Math.random() - 0.5) * 3,
            vy: 2 + Math.random() * 4,
            g: 0.05,
            size: 8 + Math.random() * 6,
            color: (s.palette ?? PALETTE.rainbow)[i % (s.palette ?? PALETTE.rainbow).length],
            life: 3,
            max: 3,
            // 3つに1つはハート・星・音符などの絵がひらひら落ちる
            sprite: i % 3 === 0 ? CONFETTI_SPRITES[(i / 3) % CONFETTI_SPRITES.length] : undefined,
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.12,
          });
        }
      },
      flash(color, alpha, ms, strong = false) {
        const a = alpha * s.intensity.flash;
        if (a <= 0) return;
        const now = performance.now();
        const f = s.flash;
        const active = now - f.start < f.ms && f.alpha > 0;
        if (active && f.strong && !strong) return;
        s.flash = { color, alpha: a, start: now, ms, strong };
      },
      flyText(text, x, y, color = '#ffffff', size = 64) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        push({ x, y, vx: Math.cos(a) * 14, vy: Math.sin(a) * 14, g: 0.2, size: 0, color, life: 1.2, max: 1.2, text, font: size });
      },
      popText(text, x, y, color = '#ffe14d', size = 36) {
        // 大きな文字ほど長く見せる
        const life = size >= 60 ? 1.3 : 0.9;
        push({ x, y, vx: 0, vy: size >= 60 ? -1 : -1.6, g: 0, size: 0, color, life, max: life, text, font: size, pop: true });
      },
      setSpeedLines(level) {
        s.speedLines = level;
      },
      setFever(stage) {
        s.fever = stage;
      },
      converge(ms) {
        if (!s.intensity.bigCutin) return;
        s.converge = { start: performance.now(), ms };
      },
      setIntensity(p) {
        s.intensity = p;
      },
      setFireworkShapes(shapes) {
        s.shapes = shapes;
      },
      setPalette(colors) {
        s.palette = colors && colors.length ? colors : null;
      },
      ring(x, y, color = '#ffffff', maxR = 160) {
        if (s.rings.length > 24) s.rings.shift();
        s.rings.push({ x, y, r: 10, max: maxR * (0.6 + 0.4 * s.intensity.particles), life: 0.5, total: 0.5, color });
      },
      beam(x1, y1, x2, y2) {
        if (s.beams.length > 6) s.beams.shift();
        s.beams.push({ x1, y1, x2, y2, life: 0.35, total: 0.35 });
        const n = scaled(40);
        for (let i = 0; i < n; i++) {
          const k = Math.random();
          push({
            x: x1 + (x2 - x1) * k,
            y: y1 + (y2 - y1) * k,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            g: 0,
            size: 6 + Math.round(Math.random() * 6),
            color: PALETTE.rainbow[i % PALETTE.rainbow.length],
            life: 0.5 + Math.random() * 0.3,
            max: 0.8,
          });
        }
      },
      bang(text, x, y, color = '#ffe14d', size = 56) {
        if (s.bangs.length > 8) s.bangs.shift();
        s.bangs.push({ x, y, text, color, size, life: 0.8, total: 0.8, rot: (Math.random() - 0.5) * 0.5 });
      },
      clear() {
        s.parts = [];
        s.rings = [];
        s.bangs = [];
        s.beams = [];
      },
    };
    return api;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const s = st.current;
    preloadHypeImages();
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      s.w = window.innerWidth;
      s.h = window.innerHeight;
      canvas.width = s.w * dpr;
      canvas.height = s.h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = dt * 60;
      ctx.clearRect(0, 0, s.w, s.h);
      ctx.imageSmoothingEnabled = false;

      // FEVER 突入：暗転＋虹の放射線が中心へ収束
      const cv = s.converge;
      const ct = (now - cv.start) / cv.ms;
      if (cv.ms > 0 && ct < 1) {
        ctx.fillStyle = `rgba(0,0,0,${0.7 * Math.sin(Math.min(1, ct * 1.2) * Math.PI) + 0.1})`;
        ctx.fillRect(0, 0, s.w, s.h);
        const cx = s.w / 2;
        const cy = s.h / 2;
        const R = Math.hypot(s.w, s.h);
        const inner = R * (1 - ct) * 0.9;
        for (let i = 0; i < 36; i++) {
          const a = (i / 36) * Math.PI * 2 + ct * 2;
          ctx.strokeStyle = PALETTE.rainbow[i % 6];
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
          ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
          ctx.stroke();
        }
      }

      // 集中線（画面のふちから内側へ。中央の問題と入力欄にはかけない）
      if (s.speedLines > 0 && s.intensity.shake > 0) {
        const cx = s.w / 2;
        const cy = s.h / 2;
        const R = Math.hypot(s.w, s.h) / 2;
        const n = Math.round(24 + 40 * s.speedLines);
        ctx.fillStyle = `rgba(255,255,255,${0.12 + 0.18 * s.speedLines})`;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const r0 = R * (0.62 + Math.random() * 0.2);
          const w = 0.006 + Math.random() * 0.012;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a - w) * R * 1.2, cy + Math.sin(a - w) * R * 1.2);
          ctx.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
          ctx.lineTo(cx + Math.cos(a + w) * R * 1.2, cy + Math.sin(a + w) * R * 1.2);
          ctx.fill();
        }
      }

      // 画面のふちの火花（コンボ段階2以上・FEVER 中。ふちから内側へ少しだけ飛ぶ）
      const sparkRate = (s.fever >= 0 ? 0.6 + 0.3 * s.fever : s.speedLines * 0.8) * s.intensity.particles * k;
      if (sparkRate > 0 && s.intensity.shake > 0 && s.parts.length < (s.fever >= 0 ? RULES.particles.capFever : RULES.particles.cap) * 0.8) {
        let n = Math.floor(sparkRate) + (Math.random() < sparkRate % 1 ? 1 : 0);
        while (n-- > 0) {
          const side = Math.floor(Math.random() * 4);
          const along = Math.random();
          const x = side === 0 ? 0 : side === 1 ? s.w : along * s.w;
          const y = side === 2 ? 0 : side === 3 ? s.h : along * s.h;
          const sp = 4 + Math.random() * 6;
          const vx = side === 0 ? sp : side === 1 ? -sp : (Math.random() - 0.5) * 3;
          const vy = side === 2 ? sp : side === 3 ? -sp : (Math.random() - 0.5) * 3;
          const life = 0.4 + Math.random() * 0.4;
          s.parts.push({ x, y, vx, vy, g: 0, size: 5 + Math.round(Math.random() * 5), color: PALETTE.rainbow[Math.floor(Math.random() * 6)], life, max: life });
        }
      }

      // パーティクル
      const parts = s.parts;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        p.vy += p.g * k;
        p.x += p.vx * k;
        p.y += p.vy * k;
        const a = Math.min(1, p.life / (p.max * 0.4));
        ctx.globalAlpha = a;
        if (p.text) {
          const prog = 1 - p.life / p.max;
          const scale = p.pop ? 0.6 + Math.min(1, prog * 5) * 0.6 : 1 + prog * 0.6;
          ctx.font = `bold ${Math.round((p.font ?? 40) * scale)}px "Press Start 2P", "DotGothic16", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = Math.max(8, (p.font ?? 40) * 0.16);
          ctx.strokeStyle = '#1d1209';
          ctx.strokeText(p.text, p.x, p.y);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y);
        } else if (p.sprite && spriteImage(p.sprite)) {
          // 絵の粒：出た瞬間にポンと大きくなり、くるくる回る
          const img = spriteImage(p.sprite)!;
          p.rot = (p.rot ?? 0) + (p.vr ?? 0) * k;
          const born = Math.min(1, (1 - p.life / p.max) * 8);
          const d = Math.round(Math.max(22, p.size * 3) * (0.5 + 0.5 * born));
          ctx.save();
          ctx.translate(Math.round(p.x), Math.round(p.y));
          ctx.rotate(p.rot);
          ctx.drawImage(img, -d / 2, -d / 2, d, d);
          ctx.restore();
        } else {
          ctx.fillStyle = '#1d1209';
          ctx.fillRect(Math.round(p.x - p.size / 2) - 2, Math.round(p.y - p.size / 2) - 2, p.size + 4, p.size + 4);
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
        }
      }
      ctx.globalAlpha = 1;

      // ビーム（太い虹の帯）
      for (let i = s.beams.length - 1; i >= 0; i--) {
        const b = s.beams[i];
        b.life -= dt;
        if (b.life <= 0) {
          s.beams.splice(i, 1);
          continue;
        }
        const k = b.life / b.total;
        const grad = ctx.createLinearGradient(b.x1, b.y1, b.x2, b.y2);
        PALETTE.rainbow.forEach((c, j) => grad.addColorStop(j / (PALETTE.rainbow.length - 1), c));
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 34 * k + 6;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 22 * k + 4;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 衝撃波の輪（四角いドットの輪）
      for (let i = s.rings.length - 1; i >= 0; i--) {
        const g = s.rings[i];
        g.life -= dt;
        if (g.life <= 0) {
          s.rings.splice(i, 1);
          continue;
        }
        const k = 1 - g.life / g.total;
        const rad = 10 + (g.max - 10) * (1 - Math.pow(1 - k, 3));
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = g.color;
        const n = 28;
        const sz = Math.max(4, 14 * (1 - k));
        for (let j = 0; j < n; j++) {
          const a = (j / n) * Math.PI * 2;
          ctx.fillRect(Math.round(g.x + Math.cos(a) * rad - sz / 2), Math.round(g.y + Math.sin(a) * rad - sz / 2), sz, sz);
        }
        ctx.globalAlpha = 1;
      }

      // ギザギザ吹き出しの文字
      for (let i = s.bangs.length - 1; i >= 0; i--) {
        const b = s.bangs[i];
        b.life -= dt;
        if (b.life <= 0) {
          s.bangs.splice(i, 1);
          continue;
        }
        const k = 1 - b.life / b.total;
        const scale = k < 0.15 ? 0.3 + (k / 0.15) * 0.9 : 1.2 - Math.min(0.2, (k - 0.15) * 0.5);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.scale(scale, scale);
        ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
        const R = b.size * (0.6 + b.text.length * 0.32);
        // パスは作った時点の座標で決まるので、大きさごとに作りなおす
        const star = (m: number) => {
          ctx.beginPath();
          const spikes = 14;
          for (let j = 0; j <= spikes * 2; j++) {
            const a = (j / (spikes * 2)) * Math.PI * 2;
            const rr = (j % 2 === 0 ? R : R * 0.72) * m;
            ctx.lineTo(Math.cos(a) * rr * 1.25, Math.sin(a) * rr * 0.75);
          }
          ctx.closePath();
        };
        const bangImg = uiImage('bang');
        if (bangImg) {
          // Gemini の爆発の絵を、文字の長さに合わせて横にのばして敷く
          const bw = R * 2.6;
          const bh = R * 1.6;
          ctx.drawImage(bangImg, -bw / 2, -bh / 2, bw, bh);
        } else {
          star(1);
          ctx.fillStyle = '#1d1209';
          ctx.fill();
          star(0.88);
          ctx.fillStyle = b.color;
          ctx.fill();
        }
        // 全部の文字に Gemini のブロック文字があれば絵で（MAX!! など）、無ければ文字で
        const glyphs = [...b.text].map((ch) => glyphImage(ch));
        if (glyphs.every(Boolean)) {
          const h = b.size * 1.25;
          const ws = glyphs.map((g) => (g!.naturalWidth / g!.naturalHeight) * h);
          let gx = -ws.reduce((a, w) => a + w, 0) / 2;
          glyphs.forEach((g, j) => {
            ctx.drawImage(g!, gx, -h / 2 + 2, ws[j], h);
            gx += ws[j];
          });
        } else {
          ctx.font = `bold ${b.size}px "DotGothic16", "Press Start 2P", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 8;
          ctx.strokeStyle = '#1d1209';
          ctx.strokeText(b.text, 0, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(b.text, 0, 2);
        }
        ctx.restore();
      }

      // FEVER のふちのネオン（段階ごとに太さ倍々）
      if (s.fever >= 0) {
        const w = Math.min(48, 6 * Math.pow(2, s.fever)) * Math.max(0.4, s.intensity.particles);
        const hue = (now / 8) % 360;
        const grad = ctx.createLinearGradient(0, 0, s.w, s.h);
        for (let i = 0; i <= 6; i++) grad.addColorStop(i / 6, `hsl(${(hue + i * 60) % 360},100%,60%)`);
        ctx.strokeStyle = grad;
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(now / 90);
        ctx.lineWidth = w;
        ctx.strokeRect(w / 2, w / 2, s.w - w, s.h - w);
        ctx.globalAlpha = 1;
      }

      // フラッシュ（弱く短く）
      const f = s.flash;
      const ft = (now - f.start) / f.ms;
      if (ft < 1 && f.alpha > 0) {
        ctx.globalAlpha = f.alpha * (1 - ft);
        ctx.fillStyle = f.color;
        ctx.fillRect(0, 0, s.w, s.h);
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-[60]" aria-hidden />;
});
