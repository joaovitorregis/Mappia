import test from 'node:test';
import assert from 'node:assert/strict';
import { createReportStore } from '../dev/report-store.mjs';

const sample = {
  category: 'Buracos na rua',
  description: 'Buraco na esquina da rua fictícia',
  location: 'Em frente ao mercado fictício',
};

function fixture() {
  let time = Date.UTC(2026, 10, 17);
  let nextId = 0;
  return {
    store: createReportStore({ now: () => time, newId: () => (++nextId).toString(16).padStart(8, '0') }),
    advance: (milliseconds) => { time += milliseconds; },
  };
}

test('accepts one fictional email or phone and never creates an account', () => {
  const { store } = fixture();
  const email = store.startVerification({ channel: 'email', contact: 'morador@example.com' });
  const phone = store.startVerification({ channel: 'phone', contact: '00000000000' });
  assert.equal(email.demoCode, '123456');
  assert.equal(phone.demoCode, '123456');
  assert.throws(() => store.startVerification({ channel: 'email', contact: 'real@gmail.com' }), { code: 'DEMO_CONTACT_ONLY' });
  assert.throws(() => store.startVerification({ channel: 'phone', contact: '11999999999' }), { code: 'DEMO_CONTACT_ONLY' });
  assert.equal(store.accountCount, 0);
});

test('requires a valid, unexpired and unspent contact proof before saving', () => {
  const { store, advance } = fixture();
  assert.throws(() => store.createReport({ ...sample, proof: '', idempotencyKey: 'first' }), { code: 'CONTACT_NOT_VERIFIED' });
  const { challengeId } = store.startVerification({ channel: 'email', contact: 'morador@example.com' });
  assert.throws(() => store.verifyContact({ challengeId, code: '000000' }), { code: 'INVALID_CODE' });
  advance(5 * 60 * 1000 + 1);
  assert.throws(() => store.verifyContact({ challengeId, code: '123456' }), { code: 'EXPIRED_CODE' });
  const fresh = store.startVerification({ channel: 'phone', contact: '00000000000' });
  const { proof } = store.verifyContact({ challengeId: fresh.challengeId, code: '123456' });
  const report = store.createReport({ ...sample, proof, idempotencyKey: 'second' });
  assert.match(report.protocol, /^MAP-2026-[A-F0-9]{8}$/);
  assert.equal(report.status, 'Em análise');
  assert.throws(() => store.createReport({ ...sample, proof, idempotencyKey: 'third' }), { code: 'CONTACT_NOT_VERIFIED' });
});

test('retries with the same key return one report and changed payload conflicts', () => {
  const { store } = fixture();
  const { challengeId } = store.startVerification({ channel: 'email', contact: 'morador@example.com' });
  const { proof } = store.verifyContact({ challengeId, code: '123456' });
  const input = { ...sample, proof, idempotencyKey: 'same-request' };
  const first = store.createReport(input);
  assert.deepEqual(store.createReport(input), first);
  assert.equal(store.reportCount, 1);
  assert.throws(() => store.createReport({ ...input, description: 'Outro relato' }), { code: 'IDEMPOTENCY_CONFLICT' });
});

test('protocol lookup exposes only safe status and category', () => {
  const { store } = fixture();
  const { challengeId } = store.startVerification({ channel: 'email', contact: 'morador@example.com' });
  const { proof } = store.verifyContact({ challengeId, code: '123456' });
  const { protocol } = store.createReport({ ...sample, proof, idempotencyKey: 'public-view' });
  assert.deepEqual(store.getPublicReport(protocol), { protocol, category: sample.category, status: 'Em análise' });
  assert.equal(store.getPublicReport('MAP-2026-FFFFFFFF'), null);
});

test('rejects incomplete reports and repeated invalid codes', () => {
  const { store } = fixture();
  const { challengeId } = store.startVerification({ channel: 'email', contact: 'morador@example.com' });
  for (let attempt = 0; attempt < 4; attempt++) {
    assert.throws(() => store.verifyContact({ challengeId, code: '000000' }), { code: 'INVALID_CODE' });
  }
  assert.throws(() => store.verifyContact({ challengeId, code: '000000' }), { code: 'TOO_MANY_ATTEMPTS' });
  assert.throws(() => store.verifyContact({ challengeId, code: '123456' }), { code: 'TOO_MANY_ATTEMPTS' });
  const fresh = store.startVerification({ channel: 'email', contact: 'morador@example.com' });
  const { proof } = store.verifyContact({ challengeId: fresh.challengeId, code: '123456' });
  assert.throws(() => store.createReport({ ...sample, description: ' ', proof, idempotencyKey: 'bad' }), { code: 'INVALID_REPORT' });
});
