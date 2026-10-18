// キャラクター（ブロッくん・ブロッちゃん・ゾンビ）の確認用デモを、ブラウザで直接開ける1ファイルにまとめる。
//   node scripts/build-character-preview.mjs  →  docs/character/preview.html
// esbuild は Vite に含まれているものを使う。
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';

const result = await build({
  entryPoints: ['src/lib/hype/characters.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'Chars',
  write: false,
  target: 'es2020',
});
const js = result.outputFiles[0].text;

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>キャラクター プレビュー</title>
<style>
  body { margin: 0; background: #2b1d14; color: #fff; font-family: sans-serif; }
  h1 { font-size: 20px; margin: 16px; }
  h2 { font-size: 16px; margin: 16px 16px 8px; color: #ffe14d; }
  p { margin: 0 16px 12px; color: #cbb; font-size: 13px; }
  .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 0 16px 16px; }
  .cell { background: #3a2a1e; border: 4px solid #1d1209; padding: 8px; text-align: center; overflow: hidden; }
  .cell svg { width: 100%; height: 200px; display: block; overflow: visible; }
  .name { font-weight: bold; }
  .desc { font-size: 12px; color: #cbb; }
  @media (max-width: 700px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
</head>
<body>
<h1>CALCRAFT マシマシモードのキャラクター</h1>
<p>1回だけの動きは、終わると少し待ってからくり返し再生しています。パンチの腕の長さは 18 マスにしています。</p>
<div id="root"></div>
<script>${js}</script>
<script>
  const { renderCharacter, MOTIONS, CHAR_VIEWBOX } = Chars;
  const DESC = {
    idle: '待機', charge: 'ため（カウントダウン中）', count: 'カウント・打鍵', cheer: '正解・万歳', shout: 'さけぶ（コンボ上位）',
    feverDance: 'FEVER ダンス', jump: 'ジャンプ', trip: 'ずっこけ（まちがい）', punch: 'パンチ（腕がのびる）', beam: 'ビーム',
    zWalk: 'ゾンビ：あるく', zHit: 'ゾンビ：やられる', zTaunt: 'ゾンビ：わらう',
  };
  const SETS = [
    ['boy', 'ブロッくん', ['idle', 'count', 'cheer', 'shout', 'feverDance', 'jump', 'trip', 'punch']],
    ['girl', 'ブロッちゃん', ['idle', 'charge', 'cheer', 'shout', 'feverDance', 'jump', 'trip', 'beam']],
    ['zombie', 'ゾンビ', ['zWalk', 'zHit', 'zTaunt']],
  ];
  const root = document.getElementById('root');
  const cells = [];
  for (const [who, label, motions] of SETS) {
    const h = document.createElement('h2');
    h.textContent = label;
    root.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'grid';
    root.appendChild(grid);
    for (const name of motions) {
      const div = document.createElement('div');
      div.className = 'cell';
      div.innerHTML = '<svg viewBox="' + CHAR_VIEWBOX + '" shape-rendering="crispEdges"></svg><div class="name">' + DESC[name] + '</div><div class="desc"><code>' + name + '</code></div>';
      grid.appendChild(div);
      cells.push({ who, name, svg: div.querySelector('svg') });
    }
  }
  const t0 = performance.now();
  const frame = (now) => {
    const t = (now - t0) / 1000;
    for (const c of cells) {
      const m = MOTIONS[c.name];
      const period = m.loop ? m.duration : m.duration + 0.6;
      const lt = m.loop ? t % m.duration : Math.min(t % period, m.duration);
      const p = m.pose(lt, 18);
      p.t = t;
      c.svg.innerHTML = renderCharacter(c.who, p);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
</script>
</body>
</html>
`;
writeFileSync('docs/character/preview.html', html);
console.log('wrote docs/character/preview.html');
