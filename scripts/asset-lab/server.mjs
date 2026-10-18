// 素材の加工台のサーバー（開発用・手元だけ）。
// node scripts/asset-lab/server.mjs → http://127.0.0.1:5199/
// _inbox/ の絵を配り、加工台（lab.html）が作った PNG を _inbox/ か src/assets/hype/ に保存する。
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 5199;
const READABLE = ['_inbox/', 'scripts/asset-lab/', 'src/assets/', 'docs/character/'];
const WRITABLE = ['_inbox/', 'src/assets/hype/'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

/** リポジトリ内の相対パスにし、許可した場所の中かを確かめる */
const safe = (p, allow) => {
  const rel = normalize(decodeURIComponent(p)).replace(/\\/g, '/').replace(/^\/+/, '');
  if (rel.includes('..') || !allow.some((a) => rel.startsWith(a))) return null;
  return join(ROOT, rel);
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(302, { Location: '/scripts/asset-lab/lab.html' });
      return res.end();
    }
    if (req.method === 'GET' && url.pathname === '/list') {
      const dir = safe(url.searchParams.get('dir') ?? '_inbox/', READABLE);
      if (!dir) throw Object.assign(new Error('forbidden'), { code: 403 });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(await readdir(dir)));
    }
    if (req.method === 'GET') {
      const file = safe(url.pathname, READABLE);
      if (!file) throw Object.assign(new Error('forbidden'), { code: 403 });
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      return res.end(body);
    }
    if (req.method === 'POST' && url.pathname === '/save') {
      const file = safe(url.searchParams.get('path') ?? '', WRITABLE);
      if (!file || extname(file) !== '.png') throw Object.assign(new Error('forbidden'), { code: 403 });
      const chunks = [];
      for await (const c of req) chunks.push(c);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, Buffer.concat(chunks));
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('ok');
    }
    throw Object.assign(new Error('not found'), { code: 404 });
  } catch (e) {
    res.writeHead(e.code === 403 ? 403 : e.code === 'ENOENT' ? 404 : e.code ?? 500, { 'Content-Type': 'text/plain' });
    res.end(String(e.message));
  }
}).listen(PORT, '127.0.0.1', () => console.log(`asset-lab: http://127.0.0.1:${PORT}/`));
