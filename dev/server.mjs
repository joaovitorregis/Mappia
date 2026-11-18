import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp'
};
const paginas = new Set(['/index.html', '/relatar.html', '/acompanhar.html', '/conta.html', '/meus-relatos.html', '/gestor/index.html']);

export async function startServer({ port = 4173 } = {}) {
  const server = createServer(async (req, res) => {
    try {
      let path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/') path = '/index.html';
      if (path === '/gestor/') path = '/gestor/index.html';
      const asset = /^\/(?:js|css|assets)(?:\/[a-zA-Z0-9_-]+)*\/[a-zA-Z0-9_.-]+$/.test(path);
      const type = mime[extname(path)];
      if (!['GET', 'HEAD'].includes(req.method) || !type || (!paginas.has(path) && !asset)) {
        res.writeHead(404).end();
        return;
      }
      const body = await readFile(resolve(root, '.' + path));
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', ok);
  });
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await startServer();
  console.log('Mappia: http://127.0.0.1:4173');
}
