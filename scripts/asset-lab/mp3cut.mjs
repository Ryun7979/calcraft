// MP3 をフレームの切れ目で切り出す（作り直さないので音は劣化しない。Node の標準機能だけ）
// node scripts/asset-lab/mp3cut.mjs 入力.mp3 出力.mp3 開始秒 終了秒
// - 先頭の ID3 タグ（Gemini の C2PA の来歴情報を含む）と、VBR の情報フレーム（Xing/Info）は捨てる。
//   切り出すと来歴の署名が合わなくなるため。来歴は docs/assets.md の台帳に書く。
// - MPEG-1/2/2.5 Layer III。切り口の1フレーム（約 26ms）は前のフレームのデータを参照して少し乱れることがあるので、
//   使う側でフェードをかける。
import { readFileSync, writeFileSync } from 'node:fs';

const [, , input, output, startArg, endArg] = process.argv;
if (!input || !output) {
  console.error('使い方: node scripts/asset-lab/mp3cut.mjs 入力.mp3 出力.mp3 開始秒 終了秒');
  process.exit(1);
}
const start = Number(startArg ?? 0);
const end = Number(endArg ?? Infinity);
const buf = readFileSync(input);

let pos = 0;
if (buf.toString('latin1', 0, 3) === 'ID3') {
  const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
  pos = 10 + size + (buf[5] & 0x10 ? 10 : 0);
}

const BITRATE = {
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const RATE = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

const kept = [];
let t = 0;
let frames = 0;
let first = true;
let info = null;
let firstSec = null;
while (pos + 4 <= buf.length) {
  const h = buf.readUInt32BE(pos);
  if ((h & 0xffe00000) >>> 0 !== 0xffe00000) {
    pos++;
    continue;
  }
  const ver = (h >> 19) & 3; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
  const layer = (h >> 17) & 3; // 1 = Layer III
  const bi = (h >> 12) & 15;
  const si = (h >> 10) & 3;
  if (ver === 1 || layer !== 1 || bi === 0 || bi === 15 || si === 3) {
    pos++;
    continue;
  }
  const kbps = BITRATE[ver === 3 ? 1 : 2][bi];
  const rate = RATE[ver][si];
  const pad = (h >> 9) & 1;
  const samples = ver === 3 ? 1152 : 576;
  const len = Math.floor(((ver === 3 ? 144 : 72) * kbps * 1000) / rate) + pad;
  if (len < 4 || pos + len > buf.length) break;
  info ??= { kbps, rate };
  const frame = buf.subarray(pos, pos + len);
  // 最初のフレームが Xing / Info（VBR の情報）なら捨てる
  const isInfo = first && (frame.includes(Buffer.from('Xing')) || frame.includes(Buffer.from('Info')));
  first = false;
  if (!isInfo) {
    if (t >= start && t < end) {
      firstSec ??= t;
      kept.push(frame);
    }
    t += samples / rate;
    frames++;
  }
  pos += len;
}

writeFileSync(output, Buffer.concat(kept));
const keptSec = (kept.length * (info ? (info.rate >= 32000 ? 1152 : 576) / info.rate : 0)).toFixed(3);
console.log(JSON.stringify({ input, output, firstSec: firstSec === null ? null : +firstSec.toFixed(4), totalSec: +t.toFixed(3), frames, kept: kept.length, keptSec: +keptSec, kbps: info?.kbps, rate: info?.rate, bytes: Buffer.concat(kept).length }));
