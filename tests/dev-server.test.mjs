import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../dev/server.mjs';

test('local API verifies a fictional contact, saves once and returns a safe protocol view', async (t) => {
  const server = await startServer({ port: 0 });
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (path, body) => {
    const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };

  const rejected = await post('/api/dev/verification', { channel: 'email', contact: 'real@gmail.com' });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.body.error, 'DEMO_CONTACT_ONLY');

  const challenge = await post('/api/dev/verification', { channel: 'email', contact: 'morador@example.com' });
  assert.equal(challenge.status, 201);
  const verified = await post('/api/dev/verify', { challengeId: challenge.body.challengeId, code: challenge.body.demoCode });
  assert.equal(verified.status, 200);

  const report = { category: 'Buracos na rua', description: 'Buraco em rua fictícia', location: 'Em frente ao mercado fictício', proof: verified.body.proof, idempotencyKey: 'request-1234' };
  const saved = await post('/api/dev/reports', report);
  assert.equal(saved.status, 201);
  assert.equal(saved.body.status, 'Em análise');
  const retried = await post('/api/dev/reports', report);
  assert.deepEqual(retried.body, saved.body);

  const lookup = await fetch(`${base}/api/dev/reports/${saved.body.protocol}`);
  assert.equal(lookup.status, 200);
  assert.deepEqual(await lookup.json(), { protocol: saved.body.protocol, category: report.category, status: 'Em análise' });
  assert.equal((await fetch(`${base}/api/dev/reports/MAP-2026-FFFFFFFF`)).status, 404);
});

test('development server serves only the public files', async (t) => {
  const server = await startServer({ port: 0 });
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/relatar.html`)).status, 200);
  assert.equal((await fetch(`${base}/js/report-ui.mjs`)).status, 200);
  assert.equal((await fetch(`${base}/docs/prd/PRD_Mappia.md`)).status, 404);
  assert.equal((await fetch(`${base}/.git/config`)).status, 404);
});
