import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('./public', import.meta.url)));
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "script-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
};

function notFound(res) {
  const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found — Taqwi</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
    background: #F4EFE5; color: #1A211B;
    font-family: Georgia, 'Times New Roman', serif; text-align: center; padding: 2rem; }
  p:first-of-type { font-size: .7rem; letter-spacing: .24em; text-transform: uppercase;
    font-family: Helvetica, Arial, sans-serif; color: #8F4527; }
  h1 { font-size: clamp(2.5rem, 8vw, 5rem); font-weight: 400; margin: .5rem 0 1rem; letter-spacing: -.03em; }
  a { display: inline-block; margin-top: 1.5rem; padding: .9rem 1.6rem; border-radius: 999px;
    background: #1A211B; color: #FBF8F2; text-decoration: none; font-family: Helvetica, Arial, sans-serif;
    font-size: .7rem; letter-spacing: .16em; text-transform: uppercase; }
</style>
</head>
<body>
  <main>
    <p>Taqwi — 404</p>
    <h1>This page has gone quiet.</h1>
    <p>The page you were looking for does not exist.</p>
    <a href="/">Return home</a>
  </main>
</body>
</html>`;
  res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(key, value);

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';

    const filePath = resolve(join(ROOT, pathname));
    if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const info = await stat(filePath).catch(() => null);
    if (!info?.isFile()) {
      notFound(res);
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const type = MIME[ext] ?? 'application/octet-stream';
    const revalidate = ext === '.html' || ext === '.css' || ext === '.js';

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': info.size,
      'Cache-Control': revalidate ? 'no-cache' : 'public, max-age=86400',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    res.end(await readFile(filePath));
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('Internal Server Error');
    console.error(error);
  }
});

server.listen(PORT, () => {
  console.log(`\n  Taqwi is live → http://localhost:${PORT}\n`);
});
