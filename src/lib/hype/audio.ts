// マシマシモードの音。短い効果音は Web Audio で合成する。
// BGM とジングルは Gemini（Web 画面）で作った MP3（ビルドに同梱。台帳は docs/assets.md）。
// MP3 は最初の操作のあとに読みこみ、読みこむまでは合成の曲で鳴らす（読みこめたら重ねて切り替える）。
// 音の大きさのバランスはこのファイルに集める。呼ぶ側は playBgm() と各効果音の名前だけを使う。

export type BgmName = 'title' | 'play' | 'fever' | 'result';
export type JingleName = 'fever' | 'levelUp' | 'rank' | 'gacha';

const byName = (m: Record<string, string>) =>
  Object.fromEntries(Object.entries(m).map(([path, url]) => [path.split('/').pop()!.replace(/\.mp3$/, ''), url]));
const BGM_URL = byName(import.meta.glob<string>('../../assets/hype/bgm/*.mp3', { eager: true, import: 'default' }));
const JINGLE_URL = byName(import.meta.glob<string>('../../assets/hype/jingle/*.mp3', { eager: true, import: 'default' }));

/** 曲ファイルのくり返し（秒）。from から鳴らしはじめ、start〜end をくり返す（つなぎ目は XFADE 秒重ねる）。
 *  start・end は小節の頭（加工台の onset / refineLoop で測った値。docs/assets.md）。
 *  gain は曲ごとの大きさをそろえる倍率（RMS 0.2 くらいに） */
const LOOP: Record<BgmName, { from: number; start: number; end: number; gain: number }> = {
  // 120bpm：前奏 0〜16.07 のあと、16 小節（32 秒）をくり返す
  title: { from: 0, start: 16.07, end: 48.07, gain: 0.9 },
  // 144bpm：前奏 0〜12.98 のあと、32 小節（53.3 秒）をくり返す
  play: { from: 0, start: 12.98, end: 66.32, gain: 0.95 },
  // 174bpm：前奏は飛ばし、いちばん盛り上がる所から。32 小節（44.1 秒）をくり返す
  fever: { from: 1.094, start: 1.094, end: 45.231, gain: 1.1 },
  // 147bpm：ファンファーレ 0〜9.39 を1回鳴らし、16 小節（26.2 秒）をくり返す
  result: { from: 0, start: 9.39, end: 35.563, gain: 1.25 },
};
const XFADE = 1.0;

/** ジングル：どのファイルの何秒目から何秒を鳴らすか（おわりはフェードアウト） */
const JINGLES: Record<JingleName, { file: string; offset: number; dur: number; vol: number }> = {
  // FEVER 突入：駆け上がるところ（150bpm）。カットインの文字を叩きつけるときに鳴らす
  fever: { file: 'fever', offset: 0.286, dur: 2.8, vol: 0.9 },
  // レベルアップ・スキル解放：ファンファーレの頭（120bpm）
  levelUp: { file: 'levelup', offset: 0.245, dur: 3.0, vol: 0.9 },
  // ランク S 以上の発表：同じ曲のいちばん盛り上がるところ
  rank: { file: 'levelup', offset: 8.005, dur: 3.4, vol: 0.75 },
  // ガチャで SR・SSR：FEVER のジングルの後半
  gacha: { file: 'fever', offset: 11.516, dur: 2.8, vol: 0.75 },
};

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

/** 操作音・正解音の音色（ガチャの「音」）。collection.ts の SoundPack と同じ形 */
export interface SoundPack {
  wave: OscillatorType;
  shift: number;
  double?: boolean;
}
const DEFAULT_PACK: SoundPack = { wave: 'square', shift: 0 };
/** 音色ごとの聞こえ方の差をそろえる（のこぎり波は大きく、正弦波は小さく聞こえる） */
const WAVE_VOL: Partial<Record<OscillatorType, number>> = { square: 1, triangle: 1.4, sine: 1.5, sawtooth: 0.6 };

class HypeAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private bgmBus!: GainNode;
  private sfxBus!: GainNode;
  /** オプションの音量（bgmBus・sfxBus は FEVER や duck で動くので、その後ろに別にかける） */
  private bgmVol!: GainNode;
  private sfxVol!: GainNode;
  private userBgm = 1;
  private userSfx = 1;
  private noiseBuf!: AudioBuffer;

  private bgmEnabled = true;
  private current: BgmName | null = null;
  private wanted: BgmName | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private duckUntil = 0;
  private pack: SoundPack = DEFAULT_PACK;

  /** 読みこんだ MP3（URL ごと） */
  private buffers = new Map<string, AudioBuffer>();
  /** いま鳴っている曲ファイル（つなぎ目で重ねるので、古いほうも少しのあいだ残る） */
  private fileVoices: { src: AudioBufferSourceNode; gain: GainNode }[] = [];
  /** 曲ファイルで鳴らしているときの、次につなぐ時刻（合成で鳴らしているときは 0） */
  private nextLoopAt = 0;
  private jingleVoices: { src: AudioBufferSourceNode; g: GainNode }[] = [];
  /** ジングルが鳴りおわる時刻（ctx の時刻）。新しい曲はこれを待って始める */
  private jingleUntil = 0;

  /** 操作音・正解音の音色を変える（null でいつもの音） */
  setSoundPack(p: SoundPack | null | undefined) {
    this.pack = p ?? DEFAULT_PACK;
  }

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
      this.bgmVol = ctx.createGain();
      this.bgmVol.gain.value = this.userBgm;
      this.bgmVol.connect(this.master);
      this.sfxVol = ctx.createGain();
      this.sfxVol.gain.value = this.userSfx;
      this.sfxVol.connect(this.master);
      this.bgmBus = ctx.createGain();
      this.bgmBus.gain.value = VOL.bgm;
      this.bgmBus.connect(this.bgmVol);
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = VOL.sfx;
      this.sfxBus.connect(this.sfxVol);
      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend();
        else this.ctx.resume();
      });
      if (this.wanted) this.startBgm(this.wanted);
      void this.loadFiles();
    }
    if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume();
  }

  /** MP3 を読みこむ（いまの曲を先に）。読めたら、合成で鳴っている同じ曲を MP3 に切り替える */
  private async loadFiles() {
    const ctx = this.ctx;
    if (!ctx) return;
    const order = [
      ...(this.wanted && BGM_URL[this.wanted] ? [BGM_URL[this.wanted]] : []),
      ...Object.values(BGM_URL),
      ...Object.values(JINGLE_URL),
    ];
    for (const url of new Set(order)) {
      if (this.buffers.has(url)) continue;
      try {
        const data = await (await fetch(url)).arrayBuffer();
        this.buffers.set(url, await ctx.decodeAudioData(data));
      } catch {
        // 読めなかった曲は合成のまま鳴らす
        continue;
      }
      const cur = this.current;
      if (cur && this.nextLoopAt === 0 && BGM_URL[cur] === url) this.startBgm(cur, true);
    }
  }

  private bgmBuffer(name: BgmName) {
    const url = BGM_URL[name];
    return url ? this.buffers.get(url) : undefined;
  }

  /** 曲ファイルを at 秒目から鳴らす（fade 秒かけて大きくする） */
  private startVoice(buf: AudioBuffer, at: number, fade: number, level: number, when = 0) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    const t = Math.max(ctx.currentTime + 0.02, when);
    gain.gain.setValueAtTime(fade > 0 ? 0.0001 : level, t);
    if (fade > 0) gain.gain.linearRampToValueAtTime(level, t + fade);
    src.connect(gain).connect(this.bgmBus);
    src.start(t, at);
    this.fileVoices.push({ src, gain });
  }

  /** 鳴っている曲ファイルを fade 秒で消す */
  private fadeVoices(fade: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const v of this.fileVoices) {
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setValueAtTime(v.gain.gain.value, t);
      v.gain.gain.linearRampToValueAtTime(0.0001, t + fade);
      v.src.stop(t + fade + 0.05);
    }
    this.fileVoices = [];
  }

  /** ジングルを止める（画面を離れたとき） */
  stopJingles() {
    for (const { src } of this.jingleVoices) {
      try {
        src.stop();
      } catch {
        // もう止まっている
      }
    }
    this.jingleVoices = [];
    this.jingleUntil = 0;
  }

  /** ジングルを鳴らす（delay 秒あと）。MP3 が読めていなければ false（呼ぶ側が合成の音で代わりに鳴らす） */
  private jingle(name: JingleName, delay = 0): boolean {
    const j = JINGLES[name];
    const url = JINGLE_URL[j.file] ?? BGM_URL[j.file];
    const buf = url ? this.buffers.get(url) : undefined;
    if (!this.ctx || !buf || j.dur <= 0) return false;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01 + delay;
    // 前のジングルは 0.15 秒で消す
    for (const v of this.jingleVoices) {
      v.g.gain.cancelScheduledValues(t);
      v.g.gain.setValueAtTime(v.g.gain.value, t);
      v.g.gain.linearRampToValueAtTime(0.0001, t + 0.15);
      v.src.stop(t + 0.2);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(j.vol, t);
    g.gain.setValueAtTime(j.vol, t + j.dur - 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + j.dur);
    src.connect(g).connect(this.sfxBus);
    src.start(t, j.offset, j.dur + 0.05);
    src.onended = () => (this.jingleVoices = this.jingleVoices.filter((v) => v.src !== src));
    this.jingleVoices.push({ src, g });
    this.jingleUntil = Math.max(this.jingleUntil, t + j.dur);
    this.duck(delay + j.dur);
    return true;
  }

  /** オプションの音量（0〜1）。BGM は曲、効果音は操作音・ジングルにかかる */
  setVolumes(bgm: number, sfx: number) {
    this.userBgm = bgm;
    this.userSfx = sfx;
    if (!this.ctx) return;
    this.bgmVol.gain.setTargetAtTime(bgm, this.ctx.currentTime, 0.03);
    this.sfxVol.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.03);
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
    if (name !== 'fever') this.stopJingles();
    this.startBgm(name);
  }

  /** crossfade = true：合成で鳴っていた同じ曲を、読めた MP3 に重ねて切り替える */
  private startBgm(name: BgmName, crossfade = false) {
    if (!this.ctx || !this.bgmEnabled) return;
    this.stopBgm(crossfade ? XFADE : 0.25);
    this.current = name;
    const buf = this.bgmBuffer(name);
    if (buf) {
      // 曲ファイル：頭から鳴らし、LOOP.end の手前で LOOP.start へ重ねてつなぐ
      const { from, gain } = LOOP[name];
      const now = this.ctx.currentTime + 0.02;
      const when = Math.max(now, this.jingleUntil - 0.3);
      // 合成の曲から切り替えるときは XFADE 秒、ジングルのあとは 0.3 秒で大きくする
      const fade = crossfade ? XFADE : when > now ? 0.3 : 0;
      this.startVoice(buf, from, fade, gain, when);
      this.nextLoopAt = when + this.loopEnd(name, buf) - from;
    } else {
      this.nextLoopAt = 0;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.05;
    }
    const target = name === 'fever' ? VOL.bgmFever : VOL.bgm;
    this.bgmBus.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  private loopEnd(name: BgmName, buf: AudioBuffer) {
    const e = LOOP[name].end;
    return e > 0 ? Math.min(e, buf.duration) : buf.duration;
  }

  private stopBgm(fade = 0.25) {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.current = null;
    this.nextLoopAt = 0;
    this.fadeVoices(fade);
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.current) return;
    if (this.nextLoopAt > 0) {
      // 曲ファイル：つなぎ目に来たら、次のくり返しを重ねて始める
      const buf = this.bgmBuffer(this.current)!;
      if (ctx.currentTime >= this.nextLoopAt - XFADE) {
        const { start, gain } = LOOP[this.current];
        this.fadeVoices(XFADE);
        this.startVoice(buf, Math.max(0, start - XFADE), XFADE, gain);
        this.nextLoopAt += this.loopEnd(this.current, buf) - start;
      }
      this.applyDuck();
      return;
    }
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
    this.applyDuck();
  }

  /** ダッキング（成功音・ジングルのあいだ曲を下げる） */
  private applyDuck() {
    const ctx = this.ctx!;
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
    const p = this.pack;
    const v = WAVE_VOL[p.wave] ?? 1;
    const m = KEY_SCALE[n % KEY_SCALE.length] + p.shift;
    const t = this.ctx!.currentTime + 0.005;
    this.tone(this.sfxBus, p.wave, midiHz(m), t, 0.09, 0.22 * v);
    this.tone(this.sfxBus, p.wave, midiHz(m + 12), t + 0.03, 0.06, (p.double ? 0.16 : 0.08) * v);
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
    const p = this.pack;
    const v = WAVE_VOL[p.wave] ?? 1;
    const notes = [...base, ...extra].map((n) => n + Math.min(level, 4) * 2 + p.shift);
    this.arp(notes, 0.05, 0.16, 0.3 * v, p.wave);
    if (p.double) this.arp(notes.map((n) => n + 12), 0.05, 0.12, 0.12 * v, p.wave);
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
    if (!this.jingle('fever', 0.8)) {
      const notes = [69, 72, 76, 81, 84, 88, 93];
      notes.forEach((n, i) => this.tone(this.sfxBus, 'square', midiHz(n), t + 1.6 + i * 0.06, 0.3, 0.25));
    }
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
    if (index >= 3 && this.jingle('rank')) return;
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
    if (this.jingle('levelUp')) return;
    this.arp([72, 76, 79, 84, 79, 84, 88, 91, 96], 0.07, 0.28, 0.27);
  }

  /** 音色のためし聞き（図鑑） */
  sample(p: SoundPack) {
    if (!this.ready()) return;
    const keep = this.pack;
    this.pack = p;
    [0, 1, 2].forEach((i) => window.setTimeout(() => this.key(i * 2), i * 110));
    window.setTimeout(() => {
      this.correct(1);
      this.pack = keep;
    }, 380);
  }

  /** ガチャ：コインを入れてハンドルを回す */
  gachaTurn() {
    if (!this.ready()) return;
    const t = this.ctx!.currentTime;
    for (let i = 0; i < 6; i++) this.tone(this.sfxBus, 'square', 300 + i * 40, t + i * 0.07, 0.05, 0.12);
    this.noise(this.sfxBus, t + 0.45, 0.12, 0.2, 800);
  }

  /** ガチャ：カプセルが落ちる・ゆれる */
  capsuleDrop() {
    if (!this.ready()) return;
    const t = this.ctx!.currentTime;
    this.tone(this.sfxBus, 'square', 900, t, 0.25, 0.15, 200);
    this.kick(this.sfxBus, t + 0.25, 0.6);
  }
  capsuleShake() {
    if (!this.ready()) return;
    const t = this.ctx!.currentTime;
    this.noise(this.sfxBus, t, 0.05, 0.12, 2500);
    this.noise(this.sfxBus, t + 0.09, 0.05, 0.12, 2500);
  }
  /** ガチャ：カプセルの色が1段上がる（step が大きいほど高い） */
  capsuleUp(step: number) {
    if (!this.ready()) return;
    this.arp([72, 79, 84].map((n) => n + step * 4), 0.05, 0.14, 0.24);
  }
  /** ガチャ：中身が出た。rarity 0〜3 */
  gachaReveal(rarity: number) {
    if (!this.ready()) return;
    this.duck(1.5 + rarity);
    const t = this.ctx!.currentTime;
    this.kick(this.sfxBus, t, 0.7);
    this.noise(this.sfxBus, t, 0.4, 0.2, 3000);
    if (rarity >= 2 && this.jingle('gacha')) return;
    const runs = [[72, 79, 84], [72, 76, 79, 84, 88], [72, 76, 79, 84, 88, 91, 96], [60, 64, 67, 72, 76, 79, 84, 88, 91, 96, 100]];
    this.arp(runs[rarity] ?? runs[0], 0.06, 0.3, 0.26);
    if (rarity >= 3) window.setTimeout(() => this.arp([96, 100, 103, 108], 0.09, 0.5, 0.2), 900);
  }
  /** ミッション達成・コインが入った */
  coin() {
    if (!this.ready()) return;
    this.arp([88, 95], 0.06, 0.18, 0.2);
  }
}

export const hypeAudio = new HypeAudio();
