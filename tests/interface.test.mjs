import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { categorias, nomeCategoria } from '../js/categorias.mjs';
import { dataLocal, etapas, transicoes } from '../js/etapas.mjs';
import { erroAmigavel } from '../js/erros.mjs';

test('as categorias do formulário correspondem ao catálogo da interface', async () => {
  const html = await readFile(new URL('../relatar.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/name="tipo" value="([^"]+)"/g)].map(([, id]) => id);
  assert.deepEqual(ids, Object.keys(categorias));
  assert.equal(nomeCategoria('vazamentos'), 'Vazamentos e esgoto a céu aberto');
  assert.equal(nomeCategoria('desconhecida'), 'Ocorrência');
});

test('o formulário começa sem um contato compartilhado que esgote o limite da turma', async () => {
  const html = await readFile(new URL('../relatar.html', import.meta.url), 'utf8');
  for (const id of ['email', 'phone']) {
    const input = html.match(new RegExp('<input\\b[^>]*\\bid="' + id + '"[^>]*>'))?.[0];
    assert.ok(input, id);
    assert.doesNotMatch(input, /\bvalue=/);
    assert.match(input, /\brequired\b/);
  }
});

test('acompanhamento e moderação usam etapas válidas e horário local', () => {
  assert.equal(etapas.recebida, 'Em análise');
  assert.deepEqual(transicoes.rejeitada, []);
  assert.deepEqual(transicoes.resolvida, []);
  assert.ok(Object.values(transicoes).flat().every(etapa => Object.hasOwn(etapas, etapa)));
  assert.match(dataLocal('2026-11-18T01:00:00Z'), /17\/11\/2026.*22:00/);
});

test('erros de verificação e autenticação orientam o próximo passo', () => {
  assert.match(erroAmigavel(new Error('CODIGO_EXPIRADO')), /Gere outro código/);
  assert.equal(erroAmigavel({ code: 'invalid_credentials' }), 'E-mail ou senha incorretos.');
  assert.match(erroAmigavel(new Error('falha de transporte')), /Confira a conexão/);
});
