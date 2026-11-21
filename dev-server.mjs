/* =========================================================================
   CELL WARRIORS — the dev server the in-browser preview uses
   -------------------------------------------------------------------------
   `npm run dev` used to be `python3 -m http.server`, which binds 0.0.0.0 but
   sends no cache headers at all. That is fine on localhost and wrong in a
   sandbox preview: a long-lived `index.html` gets revalidated, so an edited
   `power.css` / `ui.js` / `czn.js` keeps serving from cache and the page you
   are looking at is not the code you just wrote.

   This server sends `Cache-Control: no-store` for every html/css/js/json file,
   long-lived caching for images and fonts, and binds 0.0.0.0 with no host or
   origin allowlist (the preview proxies from another host). No dependencies.

   Start it with `npm run dev` (which also runs the reachability guard).
   ========================================================================= */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
};
/* Code is never cached; art is. This is the whole point of the file. */
const VOLATILE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.webmanifest']);

const server = http.createServer((req, res) => {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  if (rel === '/' || rel.endsWith('/')) rel += 'index.html';

  const file = path.normalize(path.join(ROOT, rel));
  // never serve outside the repo: ../ and absolute escapes are a hard no
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end('forbidden'); return; }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found'); return; }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': VOLATILE.has(ext) ? 'no-store, must-revalidate' : 'public, max-age=86400',
      // the preview embeds the page in a frame and proxies it from another host
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Cell Warriors dev server → http://${HOST}:${PORT}/  (code: no-store)`);
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
