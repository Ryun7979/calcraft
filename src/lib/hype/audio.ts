// マシマシモードの音。すべて Web Audio で合成する（素材ファイルなし・外部通信なし）。
// 音の大きさのバランスはこのファイルに集める。あとで Gemini 製の曲に差し替えるときも、
// playBgm() / 各効果音の関数の中身だけを差し替えればよい（呼ぶ側は変えない）。

export type BgmName = 'title' | 'play' | 'fever' | 'result';

const VOL = {
  master: 0.9,
  bgm: 0.38,
  bgmFever: 0.55,
  sfx: 0.8,
  /** 正解音などが鳴るあいだ、曲をこの割合まで下げる */
  duck: 0.35,
};

// --- 曲データ（16分音符きざみ）。'.' は休み。音名は C4 = 60 ---
const NOTE: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const parse = (s: string): (number | null)[] =>
  s.trim().split(/\s+/).map((t) => {
    if (t === '.') return null;
    const m = /^([A-G]#?)(\d)$/.exec(t);
    if (!m) return null;
    return 12 * (Number(m[2]) + 1) + NOTE[m[1]];
  });

interface Track {
  bpm: number;
  lead: (number | null)[];
  bass: (number | null)[];
  /** k = キック, s = スネア, h = ハイハット, '.' = なし */
  drum: string;
  leadWave: OscillatorType;
}

const rep = (s: string, n: number) => Array(n).fill(s).join(' ');

const TRACKS: Record<BgmName, Track> = {
  title: {
    bpm: 118,
    leadWave: 'square',
    lead: parse(`
      C5 . E5 . G5 . E5 . A5 . G5 . E5 . . .
      F5 . A5 . C6 . A5 . G5 . E5 . D5 . . .
      C5 . E5 . G5 . C6 . B5 . G5 . A5 . . .
      F5 . E5 . D5 . G5 . C5 . . . . . . .`),
    bass: parse(`
      C3 . . . C3 . . . A2 . . . A2 . . .
      F2 . . . F2 . . . G2 . . . G2 . . .
      C3 . . . C3 . . . E3 . . . A2 . . .
      F2 . . . G2 . . . C3 . . . C3 . . .`),
    drum: rep('k . h . s . h . k . h . s . h .', 4),
  },
  play: {
    bpm: 140,
    leadWave: 'square',
    lead: parse(`
      E5 . G5 E5 . C5 D5 . E5 . G5 . A5 . G5 .
      F5 . A5 F5 . D5 E5 . F5 . A5 . C6 . A5 .
      G5 . B5 G5 . E5 F5 . G5 . B5 . D6 . B5 .
      C6 . G5 . E5 . G5 . C6 . D6 . E6 . . .`),
    bass: parse(`
      C3 . C4 . C3 . C4 . A2 . A3 . A2 . A3 .
      F2 . F3 . F2 . F3 . D3 . D4 . D3 . D4 .
      G2 . G3 . G2 . G3 . E3 . E4 . E3 . E4 .
      C3 . C4 . G2 . G3 . C3 . C4 . C3 . . .`),
    drum: rep('k . h h s . h . k k h . s . h h', 4),
  },
  fever: {
    bpm: 168,
    leadWave: 'sawtooth',
    lead: parse(`
      A5 C6 E6 C6 A5 C6 E6 A6 G5 B5 D6 B5 G5 B5 D6 G6
      F5 A5 C6 A5 F5 A5 C6 F6 E5 G#5 B5 G#5 E5 G#5 B5 E6
      A5 C6 E6 C6 A5 C6 E6 A6 G5 B5 D6 B5 G5 B5 D6 G6
      F5 A5 C6 F6 G5 B5 D6 G6 A5 C6 E6 A6 A6 . A6 .`),
    bass: parse(`
      A2 A2 A3 A2 A2 A2 A3 A2 G2 G2 G3 G2 G2 G2 G3 G2
      F2 F2 F3 F2 F2 F2 F3 F2 E2 E2 E3 E2 E2 E2 E3 E2
      A2 A2 A3 A2 A2 A2 A3 A2 G2 G2 G3 G2 G2 G2 G3 G2
      F2 F2 F3 F2 G2 G2 G3 G2 A2 A2 A3 A2 A2 . A2 .`),
    drum: rep('k h s h k h s h k h s h k k s s', 4),
  },
  result: {
    bpm: 108,
    leadWave: 'triangle',
    lead: parse(`
      G5 . . E5 C6 . . G5 A5 . G5 . E5 . . .
      F5 . . D5 A5 . . F5 G5 . F5 . D5 . . .
      E5 . . G5 C6 . . E6 D6 . C6 . B5 . . .
      C6 . G5 . E5 . G5 . C6 . . . . . . .`),
    bass: parse(`
      C3 . . . E3 . . . A2 . . . C3 . . .
      F2 . . . A2 . . . G2 . . . B2 . . .
      C3 . . . E3 . . . F2 . . . G2 . . .
      C3 . . . G2 . . . C3 . . . . . . .`),
    drum: rep('k . . . s . . . k . h . s . . .', 4),
  },
};

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// 操作音の音階（ペンタトニック。1オクターブでループ）
const KEY_SCALE = [72, 74, 76, 79, 81, 84, 86, 88];

class HypeAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private bgmBus!: GainNode;
  private sfxBus!: GainNode;
  private noiseBuf!: AudioBuffer;

  private bgmEnabled = true;
  private current: BgmName | null = null;
  private wanted: BgmName | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private duckUntil = 0;

  /** ブラウザは操作のあとでないと音を出せないので、最初の操作で呼ぶ */
  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.1;
      limiter.connect(ctx.destination);
      this.master = ctx.createGain();
      this.master.gain.value = VOL.master;
      this.master.connect(limiter);
      this.bgmBus = ctx.createGain();
      this.bgmBus.gain.value = VOL.bgm;
      this.bgmBus.connect(this.master);
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = VOL.sfx;
      this.sfxBus.connect(this.master);
      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend();
        else this.ctx.resume();
      });
      if (this.wanted) this.startBgm(this.wanted);
    }
    if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume();
  }

  setBgmEnabled(on: boolean) {
    this.bgmEnabled = on;
    if (!on) this.stopBgm();
    else if (this.wanted) this.startBgm(this.wanted);
  }

  /** 曲を切り替える（いまの曲以外は止める）。null で止める */
  playBgm(name: BgmName | null) {
    this.wanted = name;
    if (!name) return this.stopBgm();
    if (!this.bgmEnabled || !this.ctx) return;
    if (this.current === name) return;
    this.startBgm(name);
  }

  private startBgm(name: BgmName) {
    if (!this.ctx || !this.bgmEnabled) return;
    this.stopBgm();
    this.current = name;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.05;
    const target = name === 'fever' ? VOL.bgmFever : VOL.bgm;
    this.bgmBus.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  private stopBgm() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.current = null;
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.current) return;
    const tr = TRACKS[this.current];
    const stepDur = 60 / tr.bpm / 4;
    const drums = tr.drum.split(/\s+/);
    while (this.nextTime < ctx.currentTime + 0.12) {
      const i = this.step % tr.lead.length;
      const t = this.nextTime;
      const lead = tr.lead[i];
      if (lead !== null) this.tone(this.bgmBus, tr.leadWave, midiHz(lead), t, stepDur * 1.6, 0.16);
      const bass = tr.bass[i % tr.bass.length];
      if (bass !== null) this.tone(this.bgmBus, 'triangle', midiHz(bass), t, stepDur * 1.8, 0.32);
      const dr = drums[i % drums.length];
      if (dr === 'k') this.kick(this.bgmBus, t, 0.5);
      else if (dr === 's') this.noise(this.bgmBus, t, 0.09, 0.22, 1800);
      else if (dr === 'h') this.noise(this.bgmBus, t, 0.03, 0.1, 7000);
      this.nextTime += stepDur;
      this.step++;
    }
    // ダッキング（成功音のあいだ曲を下げる）
    const base = this.current === 'fever' ? VOL.bgmFever : VOL.bgm;
    const target = ctx.currentTime < this.duckUntil ? base * VOL.duck : base;
    this.bgmBus.gain.setTargetAtTime(target, ctx.currentTime, 0.04);
  }

  private duck(sec: number) {
    if (!this.ctx) return;
    this.duckUntil = Math.max(this.duckUntil, this.ctx.currentTime + sec);
    const base = this.current === 'fever' ? VOL.bgmFever : VOL.bgm;
    this.bgmBus.gain.setTargetAtTime(base * VOL.duck, this.ctx.currentTime, 0.02);
  }

  // --- 音の部品 ---
  private tone(bus: AudioNode, type: OscillatorType, hz: number, t: number, dur: number, vol: number, slideTo?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(hz, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(bus: AudioNode, t: number, dur: number, vol: number, hp: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private kick(bus: AudioNode, t: number, vol: number) {
    this.tone(bus, 'sine', 150, t, 0.12, vol, 45);
  }

  private arp(notes: number[], gap: number, dur: number, vol: number, type: OscillatorType = 'square') {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + 0.01;
    notes.forEach((n, i) => this.tone(this.sfxBus, type, midiHz(n), t0 + i * gap, dur, vol));
  }

  private ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  // --- 効果音（呼ぶ側はこの名前だけを使う） ---

  /** 数字を打った。n が増えるほど音階が上がる（1オクターブでループ） */
  key(n: number) {
    if (!this.ready()) return;
    const m = KEY_SCALE[n % KEY_SCALE.length];
    const t = this.ctx!.currentTime + 0.005;
    this.tone(this.sfxBus, 'square', midiHz(m), t, 0.09, 0.22);
    this.tone(this.sfxBus, 'square', midiHz(m + 12), t + 0.03, 0.06, 0.08);
  }

  erase() {
    if (!this.ready()) return;
    this.tone(this.sfxBus, 'square', 900, this.ctx!.currentTime, 0.08, 0.15, 500);
  }

  select() {
    if (!this.ready()) return;
    this.arp([79, 84], 0.05, 0.09, 0.2);
  }

  /** 正解。level（コンボ段階）が上がるほど豪華に */
  correct(level: number) {
    if (!this.ready()) return;
    this.duck(0.6);
    const base = [72, 76, 79, 84];
    const extra = level >= 2 ? [88, 91] : [];
    this.arp([...base, ...extra].map((n) => n + Math.min(level, 4) * 2), 0.05, 0.16, 0.3);
    this.noise(this.sfxBus, this.ctx!.currentTime + 0.05, 0.25, 0.06, 6000);
  }

  /** まちがい（ガシャーン） */
  miss() {
    if (!this.ready()) return;
    const t = this.ctx!.currentTime;
    this.noise(this.sfxBus, t, 0.45, 0.4, 400);
    this.noise(this.sfxBus, t + 0.06, 0.3, 0.25, 2500);
    this.tone(this.sfxBus, 'sawtooth', 300, t, 0.35, 0.18, 70);
  }

  countdown(n: number) {
    if (!this.ready()) return;
    this.tone(this.sfxBus, 'square', midiHz(72 + (3 - n) * 4), this.ctx!.currentTime, 0.18, 0.28);
  }

  yoi() {
    if (!this.ready()) return;
    this.tone(this.sfxBus, 'triangle', 200, this.ctx!.currentTime, 0.7, 0.25, 600);
  }

  go() {
    if (!this.ready()) return;
    this.duck(0.8);
    this.arp([72, 79, 84, 88, 91, 96], 0.04, 0.3, 0.3);
    this.kick(this.sfxBus, this.ctx!.currentTime, 0.7);
  }

  tierUp(tier: number) {
    if (!this.ready()) return;
    this.duck(1);
    const root = 72 + tier * 2;
    this.arp([root, root + 4, root + 7, root + 12, root + 16, root + 19, root + 24], 0.045, 0.2, 0.26);
  }

  comboBand() {
    if (!this.ready()) return;
    this.arp([84, 88, 91, 96], 0.04, 0.12, 0.2);
  }

  feverStart() {
    if (!this.ready()) return;
    this.duck(2.4);
    const t = this.ctx!.currentTime;
    this.tone(this.sfxBus, 'sawtooth', 110, t, 0.8, 0.2, 880);
    [0.8, 1.2, 1.6].forEach((d, i) => this.kick(this.sfxBus, t + d, 0.6 + i * 0.1));
    const notes = [69, 72, 76, 81, 84, 88, 93];
    notes.forEach((n, i) => this.tone(this.sfxBus, 'square', midiHz(n), t + 1.6 + i * 0.06, 0.3, 0.25));
    this.noise(this.sfxBus, t + 1.6, 0.8, 0.15, 3000);
  }

  feverStage(stage: number) {
    if (!this.ready()) return;
    this.duck(0.8);
    const root = 81 + stage * 3;
    this.arp([root, root + 5, root + 7, root + 12], 0.05, 0.18, 0.28, 'sawtooth');
  }

  feverEnd() {
    if (!this.ready()) return;
    this.arp([84, 79, 76, 72], 0.08, 0.2, 0.18, 'triangle');
  }

  firework() {
    if (!this.ready()) return;
    const t = this.ctx!.currentTime;
    this.noise(this.sfxBus, t, 0.35, 0.12, 1200);
  }

  /** ランク発表。index は C=0 〜 ∞=6 */
  rank(index: number) {
    if (!this.ready()) return;
    this.duck(2);
    this.kick(this.sfxBus, this.ctx!.currentTime, 0.7);
    if (index >= 2) {
      const root = 72;
      const seq = [root, root + 4, root + 7, root + 12, root + 7, root + 12, root + 16, root + 19, root + 24];
      this.arp(seq.slice(0, 4 + index), 0.09, 0.3, 0.26);
    } else {
      this.arp([72, 76, 79], 0.1, 0.25, 0.22, 'triangle');
    }
  }

  best() {
    if (!this.ready()) return;
    this.duck(1.5);
    this.arp([84, 88, 91, 96, 91, 96, 100], 0.07, 0.25, 0.26);
  }

  /** パンチを打つ（シュッ） */
  punch() {
    if (!this.ready()) return;
    const t = this.ctx!.currentTime;
    this.noise(this.sfxBus, t, 0.12, 0.2, 3000);
    this.tone(this.sfxBus, 'square', 300, t, 0.12, 0.12, 900);
  }

  /** ビーム（キュイーン） */
  beam() {
    if (!this.ready()) return;
    const t = this.ctx!.currentTime;
    this.tone(this.sfxBus, 'sawtooth', 600, t, 0.3, 0.12, 2400);
    this.tone(this.sfxBus, 'square', 1200, t + 0.05, 0.25, 0.08, 3000);
  }

  /** ゾンビに当たった（ドカッ） */
  hit() {
    if (!this.ready()) return;
    const t = this.ctx!.currentTime;
    this.kick(this.sfxBus, t, 0.8);
    this.noise(this.sfxBus, t, 0.2, 0.35, 800);
    this.arp([84, 91], 0.06, 0.12, 0.14);
  }

  /** チャレンジの残り時間（urgent で高く大きく） */
  clock(urgent: boolean) {
    if (!this.ready()) return;
    this.tone(this.sfxBus, 'square', urgent ? 1760 : 1320, this.ctx!.currentTime, 0.05, urgent ? 0.22 : 0.08);
  }

  timeUp() {
    if (!this.ready()) return;
    this.duck(2);
    const t = this.ctx!.currentTime;
    [0, 0.18, 0.36].forEach((d) => this.tone(this.sfxBus, 'square', 1046, t + d, 0.14, 0.3));
    this.tone(this.sfxBus, 'sawtooth', 523, t + 0.6, 0.6, 0.25, 261);
  }

  tick() {
    if (!this.ready()) return;
    this.tone(this.sfxBus, 'square', 1800, this.ctx!.currentTime, 0.02, 0.06);
  }

  /** ゴールデン問題が出た（キラリーン） */
  golden() {
    if (!this.ready()) return;
    this.arp([88, 95, 100, 107], 0.05, 0.25, 0.18, 'triangle');
    this.noise(this.sfxBus, this.ctx!.currentTime, 0.4, 0.05, 8000);
  }

  /** ボーナスタイムが始まった（double = W ボーナス） */
  bonus(double: boolean) {
    if (!this.ready()) return;
    this.duck(1);
    const seq = double ? [76, 81, 84, 88, 93, 96, 100] : [76, 81, 84, 88, 93];
    this.arp(seq, 0.05, 0.22, 0.26);
    this.kick(this.sfxBus, this.ctx!.currentTime, 0.6);
  }

  /** おまもりでコンボを守った（キン！） */
  shield() {
    if (!this.ready()) return;
    const t = this.ctx!.currentTime;
    this.tone(this.sfxBus, 'square', 1568, t, 0.15, 0.2);
    this.tone(this.sfxBus, 'triangle', 2093, t + 0.04, 0.3, 0.15);
  }

  /** 経験値バーが伸びる（短いピッ。だんだん高く） */
  xpTick(k: number) {
    if (!this.ready()) return;
    this.tone(this.sfxBus, 'square', 600 + k * 900, this.ctx!.currentTime, 0.03, 0.06);
  }

  /** プレイヤーのレベルアップ */
  levelUp() {
    if (!this.ready()) return;
    this.duck(2);
    const t = this.ctx!.currentTime;
    this.kick(this.sfxBus, t, 0.7);
    this.arp([72, 76, 79, 84, 79, 84, 88, 91, 96], 0.07, 0.28, 0.27);
  }
}

export const hypeAudio = new HypeAudio();
