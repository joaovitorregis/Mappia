import test from 'node:test';
import assert from 'node:assert/strict';
import { contactFromForm, reportFromForm } from '../js/report-flow.mjs';

test('email selection sends only email, never phone, name or CPF', () => {
  const data = new FormData();
  data.set('contact-channel', 'email');
  data.set('email', 'morador@example.com');
  data.set('phone', '00000000000');
  data.set('nome', 'Não enviar');
  data.set('cpf', 'Não enviar');
  assert.deepEqual(contactFromForm(data), { channel: 'email', contact: 'morador@example.com' });
});

test('phone selection sends only phone and report payload has no private contact', () => {
  const data = new FormData();
  data.set('contact-channel', 'phone');
  data.set('phone', '00000000000');
  data.set('email', 'morador@example.com');
  data.set('tipo', 'Buracos na rua');
  data.set('descricao', 'Buraco fictício na esquina');
  data.set('endereco', 'Rua fictícia, esquina');
  assert.deepEqual(contactFromForm(data), { channel: 'phone', contact: '00000000000' });
  assert.deepEqual(reportFromForm(data, 'proof-1234', 'retry-1234'), {
    category: 'Buracos na rua', description: 'Buraco fictício na esquina', location: 'Rua fictícia, esquina', proof: 'proof-1234', idempotencyKey: 'retry-1234',
  });
});
