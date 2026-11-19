import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criarHandler } from './handler.mjs';

const id = '0deb4948-da88-4b13-a145-e6c17bcf2dea';
const prova = '1'.repeat(64);
const foto = 'real/753ea05f-ea96-4bf1-8b36-620a7967ed86.jpg';
const email = 'teste@example.test';
const origin = 'https://mappia.example.test';
const env = {
  MAPPIA_CONTACT_STATE: 'public',
  MAPPIA_ALLOWED_ORIGINS: origin,
  SUPABASE_URL: 'https://banco.example.test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-ficticia',
  TURNSTILE_SECRET_KEY: 'captcha-ficticio',
  TWILIO_API_KEY_SID: 'SK' + 'a'.repeat(32),
  TWILIO_API_KEY_SECRET: 'api-ficticia',
  TWILIO_VERIFY_SERVICE_SID: 'VA' + 'b'.repeat(32)
};

function montar(respostas = {}, config = {}) {
  const chamadas = [];
  const fetchMock = async (url, init) => {
    chamadas.push({ url, init });
    const rota = new URL(url).pathname.split('/').at(-1);
    if (Object.hasOwn(respostas, rota)) return respostas[rota](init);
    const padrao = {
      siteverify: { success: true, hostname: 'mappia.example.test', action: 'contato-envio' },
      preparar_verificacao_real: { verificacao_id: id, contato: email },
      Verifications: { sid: 'VE' + 'c'.repeat(32), status: 'pending', to: email, channel: 'email' },
      registrar_tentativa_real: { canal: 'email', contato: email },
      VerificationCheck: { status: 'approved', valid: true, to: email, channel: 'email' },
      emitir_prova_real: prova,
      autorizar_foto_real: foto,
      [foto.split('/').at(-1)]: { url: '/object/upload/sign/fotos/' + foto + '?token=token-ficticio' }
    };
    assert.ok(Object.hasOwn(padrao, rota), rota);
    return Response.json(padrao[rota]);
  };
  const handler = criarHandler({ ...env, ...config }, fetchMock);
  const chamada = (body, { from = origin, method = 'POST', type = 'application/json' } = {}) =>
    handler(new Request('https://banco.example.test/functions/v1/contato-verificacao', {
      method, headers: { Origin: from, 'Content-Type': type },
      ...(method !== 'OPTIONS' && { body: typeof body === 'string' ? body : JSON.stringify(body) })
    }));
  return { chamada, chamadas };
}

test('envia código via provedor após validar CAPTCHA e retorna só o identificador', async () => {
  const { chamada, chamadas } = montar();
  const result = await chamada({ acao: 'enviar', canal: 'email', contato: email, captcha: 'token' });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { verificacao_id: id });
  assert.equal(result.headers.get('access-control-allow-origin'), origin);
  assert.equal(chamadas.length, 3);
  assert.equal(chamadas[0].init.body.get('response'), 'token');
  assert.deepEqual(JSON.parse(chamadas[1].init.body), { canal: 'email', contato: email });
  assert.equal(chamadas[2].init.body.get('To'), email);
  assert.equal(chamadas[2].init.body.get('Channel'), 'email');
  assert.equal(chamadas[2].init.redirect, 'error');
});

test('fecha todas as operações na ausência de modo explícito ou lista válida do piloto', async () => {
  for (const config of [
    { MAPPIA_CONTACT_STATE: undefined },
    { MAPPIA_CONTACT_STATE: 'ativado' },
    { MAPPIA_CONTACT_STATE: 'pilot', MAPPIA_PILOT_CONTACTS: 'inválido' }
  ]) {
    const { chamada, chamadas } = montar({}, config);
    for (const body of [
      { acao: 'enviar', canal: 'email', contato: email, captcha: 'token' },
      { acao: 'confirmar', verificacao_id: id, codigo: '123456' },
      { acao: 'foto', prova }
    ]) {
      const result = await chamada(body);
      assert.equal(result.status, 503);
      assert.deepEqual(await result.json(), { erro: 'VERIFICACAO_INDISPONIVEL' });
    }
    assert.equal(chamadas.length, 0);
  }
});

test('no piloto valida a lista após normalização antes de enviar ou confirmar', async () => {
  const config = { MAPPIA_CONTACT_STATE: 'pilot', MAPPIA_PILOT_CONTACTS: ' TESTE@EXAMPLE.TEST , (83) 99999-0000 ' };
  const { chamada, chamadas } = montar({}, config);
  assert.deepEqual(await (await chamada({
    acao: 'enviar', canal: 'email', contato: ' TESTE@EXAMPLE.TEST ', captcha: 'token'
  })).json(), { verificacao_id: id });
  const recusado = await chamada({
    acao: 'enviar', canal: 'email', contato: 'fora@example.test', captcha: 'token'
  });
  assert.equal(recusado.status, 503);
  assert.equal(chamadas.length, 4, 'Fora da lista chama apenas o CAPTCHA');
  assert.deepEqual(await (await chamada({ acao: 'confirmar', verificacao_id: id, codigo: '123456' })).json(), { prova });

  const divergente = montar({
    registrar_tentativa_real: () => Response.json({ canal: 'email', contato: 'fora@example.test' })
  }, config);
  assert.equal((await divergente.chamada({ acao: 'confirmar', verificacao_id: id, codigo: '123456' })).status, 503);
  assert.equal(divergente.chamadas.length, 1, 'Fora da lista não aciona o provedor na confirmação');
});

test('não aciona o provedor em origem, método, MIME, corpo ou CAPTCHA inválidos', async () => {
  const { chamada, chamadas } = montar({
    siteverify: () => Response.json({ success: true, hostname: 'mappia.example.test', action: 'outra-acao' })
  });
  const body = { acao: 'enviar', canal: 'email', contato: email, captcha: 'token' };
  assert.equal((await chamada(body, { from: 'https://outro.example.test' })).status, 403);
  assert.equal((await chamada(body, { method: 'PUT' })).status, 405);
  assert.equal((await chamada(body, { type: 'text/plain' })).status, 415);
  assert.equal((await chamada(' '.repeat(4200))).status, 413);
  assert.equal((await chamada(body, { method: 'OPTIONS' })).status, 204);
  assert.equal(chamadas.length, 0);
  const response = await chamada(body);
  assert.deepEqual(await response.json(), { erro: 'CAPTCHA_INVALIDO' });
  assert.equal(chamadas.length, 1);
});

test('confirma o contato no provedor antes de emitir a prova e bloqueia resposta cruzada', async () => {
  const entrada = { acao: 'confirmar', verificacao_id: id, codigo: '123456' };
  const normal = montar();
  assert.deepEqual(await (await normal.chamada(entrada)).json(), { prova });
  assert.equal(normal.chamadas[1].init.body.get('To'), email);
  assert.equal(normal.chamadas[1].init.body.get('Code'), '123456');
  const divergente = montar({
    VerificationCheck: () => Response.json({ status: 'approved', valid: true, to: 'outro@example.test', channel: 'email' })
  });
  assert.deepEqual(await (await divergente.chamada(entrada)).json(), { erro: 'CODIGO_INVALIDO' });
  assert.equal(divergente.chamadas.length, 2);
});

test('usa o destino brasileiro normalizado pelo banco para verificar SMS', async () => {
  const contato = '+5583999990000';
  const { chamada, chamadas } = montar({
    preparar_verificacao_real: () => Response.json({ verificacao_id: id, contato }),
    Verifications: () => Response.json({ status: 'pending', to: contato, channel: 'sms' })
  });
  const result = await chamada({ acao: 'enviar', canal: 'telefone', contato: '(83) 99999-0000', captcha: 'token' });
  assert.deepEqual(await result.json(), { verificacao_id: id });
  assert.equal(chamadas[2].init.body.get('To'), contato);
  assert.equal(chamadas[2].init.body.get('Channel'), 'sms');
  assert.equal((await chamada({ acao: 'enviar', canal: 'telefone', contato: '+12025550100', captcha: 'token' })).status, 400);
  assert.equal(chamadas.length, 3);
});

test('recebe só um caminho autorizado para assinar a foto e preserva erros públicos conhecidos', async () => {
  const { chamada, chamadas } = montar();
  assert.deepEqual(await (await chamada({ acao: 'foto', prova })).json(), { path: foto, token: 'token-ficticio' });
  assert.match(chamadas[1].url, /\/storage\/v1\/object\/upload\/sign\/fotos\/real\//);
  assert.equal(chamadas[1].init.headers['x-upsert'], undefined);
  const fechado = montar({
    preparar_verificacao_real: () => Response.json({ message: 'VERIFICACAO_INDISPONIVEL' }, { status: 400 })
  });
  const result = await fechado.chamada({ acao: 'enviar', canal: 'email', contato: email, captcha: 'token' });
  assert.equal(result.status, 503);
  assert.deepEqual(await result.json(), { erro: 'VERIFICACAO_INDISPONIVEL' });
  assert.equal(fechado.chamadas.length, 2);
});
