#!/usr/bin/env node
/**
 * Bağımlılıksız küçük statik sunucu: `npm start`.
 * Python ya da başka bir araç gerektirmez; Windows, macOS ve Linux'ta aynı çalışır.
 * Kullanım: node tools/serve.js [port]   (varsayılan 8080, PORT ortam değişkeni de olur)
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] ?? process.env.PORT ?? 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = normalize(join(root, decodeURIComponent(url.pathname)));
    // Proje klasörünün dışına çıkmayı engelle (../ ile).
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403).end('Yasak');
      return;
    }
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
    const body = await readFile(path);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bulunamadı');
  }
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✗ ${port} portu kullanımda. Başka bir port dene: npm start -- 8081`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(port, () => {
  console.log(`✓ Dinleme modülü çalışıyor: http://localhost:${port}`);
  console.log('  Durdurmak için Ctrl+C');
});
