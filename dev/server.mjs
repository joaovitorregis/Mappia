import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReportStore, ReportError } from './report-store.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicFiles = new Set(['/index.html', '/relatar.html', '/acompanhar.html', '/css/mappia.css', '/js/figma.js', '/js/report-flow.mjs', '/js/report-ui.mjs']);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let input = '';
  for await (const chunk of request) {
    input += chunk;
    if (input.length > 16_384) throw new ReportError('REQUEST_TOO_LARGE', 413);
  }
  try { return JSON.parse(input); }
  catch { throw new ReportError('INVALID_JSON'); }
}

export async function startServer({ port = 4173, store = createReportStore() } = {}) {
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (request.method === 'POST' && pathname === '/api/dev/verification') {
        return json(response, 201, store.startVerification(await readJson(request)));
      }
      if (request.method === 'POST' && pathname === '/api/dev/verify') {
        return json(response, 200, store.verifyContact(await readJson(request)));
      }
      if (request.method === 'POST' && pathname === '/api/dev/reports') {
        return json(response, 201, store.createReport(await readJson(request)));
      }
      const match = pathname.match(/^\/api\/dev\/reports\/(MAP-\d{4}-[A-Fa-f0-9]{8})$/);
      if (request.method === 'GET' && match) {
        const report = store.getPublicReport(match[1]);
        return json(response, report ? 200 : 404, report ?? { error: 'NOT_FOUND' });
      }
      if (request.method !== 'GET') return json(response, 404, { error: 'NOT_FOUND' });
      const file = pathname === '/' ? '/index.html' : pathname;
      if (!publicFiles.has(file) && !/^\/assets\/figma\/[a-zA-Z0-9_.-]+\.(?:svg|png|jpg|webp)$/.test(file)) {
        return json(response, 404, { error: 'NOT_FOUND' });
      }
      try {
        const bytes = await readFile(resolve(root, `.${file}`));
        response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
        return response.end(bytes);
      } catch (error) {
        if (error.code === 'ENOENT') return json(response, 404, { error: 'NOT_FOUND' });
        throw error;
      }
    } catch (error) {
      if (error instanceof ReportError) return json(response, error.status, { error: error.code });
      return json(response, 500, { error: 'INTERNAL_ERROR' });
    }
  });
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolveListen);
  });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().then((server) => {
    console.log(`Mappia local: http://127.0.0.1:${server.address().port}`);
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
