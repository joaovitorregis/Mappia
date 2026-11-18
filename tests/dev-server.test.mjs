import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../dev/server.mjs';

test('servidor estático entrega a interface e protege arquivos privados', async (t) => {
  const server = await startServer({ port: 0 });
  t.after(() => server.close());
  const base = 'http://127.0.0.1:' + server.address().port;
  assert.equal((await fetch(base + '/relatar.html')).status, 200);
  assert.match((await fetch(base + '/js/supabase.mjs')).headers.get('content-type') || '', /javascript/);
  for (const path of ['/api/dev/verification', '/.env.mappia-test', '/.git/config', '/supabase/seed.sql', '/%2e%2e%2f.env.mappia-test']) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
});
