import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const gestor = '00000000-0000-4000-8000-000000000001';
const morador = '00000000-0000-4000-8000-000000000002';
const outroMorador = '00000000-0000-4000-8000-000000000003';
const migrations = ['0001_mappia.sql', '0002_recuperar_token_envio.sql', '0003_separar_producao.sql'];

async function checkFlow({ anon, manager, direct }) {
  const id = randomUUID();
  const challenge = await anon('iniciar_verificacao', { canal: 'email', contato: id + '@example.com' });
  for (let i = 0; i < 4; i++) {
    assert.deepEqual(await anon('confirmar_codigo', { verificacao_id: challenge.verificacao_id, codigo: 'x' }), { erro: 'CODIGO_INVALIDO' });
  }
  const { prova } = await anon('confirmar_codigo', { verificacao_id: challenge.verificacao_id, codigo: challenge.codigo_demo });
  assert.ok(prova);
  const args = { prova, categoria: 'buracos', descricao: 'Relato fictício para teste', referencia: 'Praça de teste', lat: -7.23074, lng: -35.88112, foto_path: null, chave_idempotencia: id };
  const created = await anon('criar_relato', args);
  assert.match(created.protocolo, /^MAP-\d{4}-[A-F0-9]{8}$/);
  assert.ok(created.token);
  const retry = await anon('criar_relato', args);
  assert.deepEqual(retry, created, 'A repetição exata recupera o token se a resposta anterior se perder');
  await assert.rejects(anon('criar_relato', { ...args, descricao: 'Descrição modificada' }), /IDEMPOTENCIA_CONFLITO/);
  await assert.rejects(anon('criar_relato', { ...args, chave_idempotencia: randomUUID() }), /CONTATO_NAO_VERIFICADO/);
  const [lookup] = await anon('consultar_protocolo', { protocolo: created.protocolo });
  assert.equal(lookup.etapa, 'Em análise');
  assert.deepEqual(Object.keys(lookup).sort(), ['categoria', 'protocolo', 'etapa', 'historico', 'criado_em', 'atualizado_em'].sort());
  assert.ok(!(await anon('ocorrencias_publicas')).some(row => row.protocolo === created.protocolo));
  await direct();
  const found = (await manager('gestor_listar', { periodo: 'hoje' })).find(row => row.protocolo === created.protocolo);
  assert.ok(found);
  const update = { id: found.id, nova_etapa: 'validada', observacao: 'Observação interna' };
  await assert.rejects(anon('gestor_alterar_etapa', update));
  await assert.rejects(manager('gestor_alterar_etapa', { ...update, nova_etapa: 'resolvida' }), /TRANSICAO_INVALIDA/);
  await manager('gestor_alterar_etapa', update);
  const publicRow = (await anon('ocorrencias_publicas')).find(row => row.protocolo === created.protocolo);
  assert.equal(publicRow.lat, -7.231);
  assert.equal(publicRow.lng, -35.881);
  assert.equal(publicRow.etapa, 'validada');
  assert.ok(!('contato' in publicRow) && !('foto_path' in publicRow));
  assert.ok(!JSON.stringify(await anon('consultar_protocolo', { protocolo: created.protocolo })).includes(update.observacao));
  return { created, args, update };
}

test('Postgres local aplica a migração e separa acesso anônimo, morador e gestor', async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    insert into auth.users values ('${gestor}'), ('${morador}'), ('${outroMorador}');
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant select, insert on storage.objects to anon, authenticated;
  `);
  for (const migration of migrations) {
    await db.exec(await readFile(new URL('../supabase/migrations/' + migration, import.meta.url), 'utf8'));
  }
  await db.exec("update public.configuracao set valor = 'true' where chave = 'modo_apresentacao'");
  await db.query('insert into public.gestores values ($1)', [gestor]);

  function as(role, user) {
    return (name, args = {}) => db.transaction(async tx => {
      await tx.exec('set local role ' + role);
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [user ?? '']);
      const entries = Object.entries(args);
      const params = entries.map(([key], i) => key + ' => $' + (i + 1)).join(', ');
      const { rows } = await tx.query('select * from public.' + name + '(' + params + ')', entries.map(([, value]) => value));
      return rows[0] && Object.hasOwn(rows[0], name) ? rows[0][name] : rows;
    });
  }

  const resident = as('authenticated', morador);
  assert.equal(await resident('sou_gestor'), false);
  const { created, args, update } = await checkFlow({
    anon: as('anon'),
    manager: as('authenticated', gestor),
    direct: () => assert.rejects(db.transaction(async tx => {
      await tx.exec('set local role anon');
      await tx.exec('select * from public.relatos');
    }), /permission denied/)
  });
  await assert.rejects(resident('gestor_alterar_etapa', update), /ACESSO_GESTOR/);
  assert.deepEqual(await resident('meus_relatos'), []);
  const otherResident = as('authenticated', outroMorador);
  assert.equal(await otherResident('vincular_relatos', { tokens: [created.protocolo] }), 0);
  assert.equal(await resident('vincular_relatos', { tokens: [created.token] }), 1);
  assert.equal((await resident('meus_relatos'))[0].protocolo, created.protocolo);
  assert.equal(await resident('vincular_relatos', { tokens: [created.token] }), 0);
  assert.equal(await otherResident('vincular_relatos', { tokens: [created.token] }), 0);
  assert.deepEqual(await as('anon')('criar_relato', args), { protocolo: created.protocolo });
  assert.deepEqual(await otherResident('meus_relatos'), []);
  assert.deepEqual(await as('anon')('indicadores_publicos'), { validada: 1, encaminhada: 0, resolvida: 0 });
  const anonymous = as('anon');
  const challenge = await anonymous('iniciar_verificacao', { canal: 'telefone', contato: '(83) 00000-0000' });
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.equal((await anonymous('confirmar_codigo', { verificacao_id: challenge.verificacao_id, codigo: 'x' })).erro,
      attempt < 4 ? 'CODIGO_INVALIDO' : 'TENTATIVAS_ESGOTADAS');
  }
  assert.equal((await anonymous('confirmar_codigo', {
    verificacao_id: challenge.verificacao_id, codigo: challenge.codigo_demo
  })).erro, 'TENTATIVAS_ESGOTADAS');

  async function storageAs(role, sql, user) {
    return db.transaction(async tx => {
      await tx.exec('set local role ' + role);
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [user ?? '']);
      return (await tx.query(sql)).rows;
    });
  }
  await assert.rejects(storageAs('anon', "insert into storage.objects values ('fotos', 'publica.jpg')"), /row-level security/);
  await assert.rejects(storageAs('anon', "insert into storage.objects values ('fotos', 'pendentes/00000000-0000-4000-8000-000000000003.jpg')"), /row-level security/);
  await db.exec("insert into storage.objects values ('fotos', 'pendentes/00000000-0000-4000-8000-000000000003.jpg')");
  assert.deepEqual(await storageAs('anon', 'select name from storage.objects'), []);
  assert.deepEqual(await storageAs('authenticated', 'select name from storage.objects', morador), []);
  assert.deepEqual(await storageAs('authenticated', 'select name from storage.objects', gestor), []);
  await db.exec("update public.relatos set foto_path = 'pendentes/00000000-0000-4000-8000-000000000003.jpg'");
  assert.equal((await storageAs('authenticated', 'select name from storage.objects', gestor)).length, 1);
  // O Storage real remove o objeto físico. A tabela aqui é somente um substituto local.
  await db.exec('delete from storage.objects');

  const { rows: [{ total }] } = await db.query('select count(*)::int as total from public.relatos');
  assert.equal(total, 1);
  await db.exec(await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8'));
  assert.equal((await as('anon')('ocorrencias_publicas')).length, 11);

  // Imita o corte público. Os registros antigos continuam isolados no banco.
  await db.exec("update public.configuracao set valor = 'false' where chave = 'modo_apresentacao'");
  assert.equal(await anonymous('recebimento_real_disponivel'), false);
  assert.deepEqual(await anonymous('ocorrencias_publicas'), []);
  assert.deepEqual(await anonymous('consultar_protocolo', { protocolo: created.protocolo }), []);
  assert.deepEqual(await resident('meus_relatos'), []);
  assert.deepEqual(await as('authenticated', gestor)('gestor_listar'), []);
  await assert.rejects(anonymous('iniciar_verificacao', { canal: 'email', contato: 'demo@example.com' }), /VERIFICACAO_INDISPONIVEL/);
  const edge = as('service_role');
  await assert.rejects(edge('preparar_verificacao_real', { canal: 'email', contato: 'real@example.com' }), /VERIFICACAO_INDISPONIVEL/);

  await db.exec("update public.configuracao set valor = 'true' where chave = 'recebimento_real_ativo'");
  assert.equal(await anonymous('recebimento_real_disponivel'), true);
  await assert.rejects(anonymous('criar_relato', { ...args, chave_idempotencia: randomUUID() }), /CONTATO_NAO_VERIFICADO/);
  await assert.rejects(anonymous('preparar_verificacao_real', { canal: 'email', contato: 'real@example.com' }), /permission denied/);
  const telefoneReal = await edge('preparar_verificacao_real', { canal: 'telefone', contato: '(83) 91234-5678' });
  assert.equal(telefoneReal.contato, '+5583912345678');
  await assert.rejects(edge('preparar_verificacao_real', { canal: 'telefone', contato: '+5583912345678' }), /LIMITE_CODIGOS/);
  const emailReal = await edge('preparar_verificacao_real', { canal: 'email', contato: ' Teste@Example.com ' });
  const verificacao_id = emailReal.verificacao_id;
  await assert.rejects(edge('emitir_prova_real', { verificacao_id }), /CONTATO_NAO_VERIFICADO/);
  assert.deepEqual(await edge('registrar_tentativa_real', { verificacao_id }), { canal: 'email', contato: 'teste@example.com' });
  await assert.rejects(anonymous('emitir_prova_real', { verificacao_id }), /permission denied/);
  const provaReal = await edge('emitir_prova_real', { verificacao_id });
  await assert.rejects(edge('emitir_prova_real', { verificacao_id }), /CONTATO_NAO_VERIFICADO/);
  const foto = await edge('autorizar_foto_real', { prova: provaReal });
  assert.match(foto, /^real\/[\w-]+\.jpg$/);
  assert.equal(await edge('autorizar_foto_real', { prova: provaReal }), foto);
  await db.query("insert into storage.objects values ('fotos', $1), ('fotos', 'real/outra.jpg')", [foto]);
  const pedidoReal = { ...args, prova: provaReal, foto_path: foto, chave_idempotencia: randomUUID() };
  await assert.rejects(anonymous('criar_relato', { ...pedidoReal, foto_path: 'real/outra.jpg' }), /FOTO_INVALIDA/);
  const relatoReal = await anonymous('criar_relato', pedidoReal);
  const gestores = as('authenticated', gestor);
  const [registro] = await gestores('gestor_listar');
  assert.equal(registro.protocolo, relatoReal.protocolo);
  assert.ok(!('contato' in registro));
  await gestores('gestor_alterar_etapa', { id: registro.id, nova_etapa: 'validada' });
  const [publico] = await anonymous('ocorrencias_publicas');
  assert.equal(publico.protocolo, relatoReal.protocolo);
  assert.ok(!('referencia' in publico) && !('foto_path' in publico) && !('contato' in publico));
  assert.deepEqual(await storageAs('anon', 'select name from storage.objects'), []);
  assert.deepEqual(await storageAs('authenticated', 'select name from storage.objects', gestor), [{ name: foto }]);
  await assert.rejects(db.exec(await readFile(new URL('../supabase/reset_apresentacao.sql', import.meta.url), 'utf8')), /MODO_APRESENTACAO_DESATIVADO/);
  await db.exec('rollback');
  assert.equal(await as('authenticated', gestor)('sou_gestor'), true);
});

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
test('Supabase hospedado oculta demonstração e bloqueia emissão de código fictício', {
  skip: process.env.MAPPIA_TEST_REMOTE !== '1'
}, async () => {
  assert.ok(SUPABASE_URL && SUPABASE_ANON_KEY, 'Configure o endereço e a chave pública no ambiente local');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const anonymous = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);
  const rpc = client => async (name, args) => {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new Error(error.message);
    return data;
  };
  const anon = rpc(anonymous);
  const entradaAtiva = await anon('recebimento_real_disponivel');
  assert.equal(typeof entradaAtiva, 'boolean');
  const mapa = await anon('ocorrencias_publicas');
  if (process.env.MAPPIA_EXPECT_CLOSED === '1') {
    assert.equal(entradaAtiva, false);
    assert.deepEqual(mapa, []);
  }
  for (const relato of mapa) {
    assert.ok(!('contato' in relato) && !('referencia' in relato) && !('foto_path' in relato));
  }
  assert.deepEqual(await anon('consultar_protocolo', { protocolo: 'MAP-2026-DE000001' }), []);
  await assert.rejects(anon('iniciar_verificacao', { canal: 'email', contato: 'corte@example.com' }), /VERIFICACAO_INDISPONIVEL/);
  const { data, error } = await anonymous.from('relatos').select('id').limit(1);
  assert.ok(error || data?.length === 0, 'A consulta direta não pode expor registros');
});
