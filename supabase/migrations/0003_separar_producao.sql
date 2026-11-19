-- Distingue dados de demonstração dos recebidos após prova de posse.
alter table public.verificacoes add column demonstracao boolean not null default true;
alter table public.verificacoes add column foto_real_path text unique;
alter table public.relatos add column demonstracao boolean not null default true;
create index verificacoes_reais_por_horario on public.verificacoes (criado_em) where not demonstracao;
insert into public.configuracao (chave, valor) values ('recebimento_real_ativo', 'false');

create function public.mappia_demonstracao_ativa()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.configuracao where chave = 'modo_apresentacao' and valor = 'true'::jsonb);
$$;

create function public.recebimento_real_disponivel()
returns boolean language sql stable security definer set search_path = '' as $$
  select not public.mappia_demonstracao_ativa() and exists (
    select 1 from public.configuracao where chave = 'recebimento_real_ativo' and valor = 'true'::jsonb
  );
$$;

create function public.preparar_verificacao_real(canal text, contato text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  destino text := lower(btrim(contato));
  desafio uuid;
begin
  if not public.recebimento_real_disponivel() then
    raise exception 'VERIFICACAO_INDISPONIVEL';
  end if;
  if canal = 'telefone' then
    destino := regexp_replace(destino, '[ ()-]', '', 'g');
    if destino ~ '^[1-9][0-9][2-9][0-9]{7,8}$' then destino := '+55' || destino; end if;
  end if;
  if not coalesce(
    (canal = 'email' and char_length(destino) <= 254 and destino ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (canal = 'telefone' and destino ~ '^\+55[1-9][0-9][2-9][0-9]{7,8}$'), false
  ) then
    raise exception 'CONTATO_INVALIDO';
  end if;

  -- O teto global também limita custo quando terceiros variam o contato.
  perform pg_advisory_xact_lock(hashtextextended('mappia:entregas:real', 4));
  if (select count(*) from public.verificacoes v where not v.demonstracao
        and v.criado_em >= now() - interval '1 hour') >= 80
    or (select count(*) from public.verificacoes v where not v.demonstracao
        and v.criado_em >= now() - interval '1 minute') >= 15 then
    raise exception 'LIMITE_GLOBAL';
  end if;
  if (select count(*) from public.verificacoes v where not v.demonstracao
        and v.canal = $1 and v.contato = destino and v.criado_em >= now() - interval '1 hour') >= 5
    or exists (select 1 from public.verificacoes v where not v.demonstracao
        and v.canal = $1 and v.contato = destino and v.criado_em >= now() - interval '1 minute') then
    raise exception 'LIMITE_CODIGOS';
  end if;

  insert into public.verificacoes (canal, contato, codigo_hash, expira_em, demonstracao)
  values ($1, destino, 'verificado-pelo-provedor', now() + interval '10 minutes', false)
  returning id into desafio;
  return jsonb_build_object('verificacao_id', desafio, 'contato', destino);
end;
$$;

create function public.registrar_tentativa_real(verificacao_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.verificacoes%rowtype;
begin
  if not public.recebimento_real_disponivel() then raise exception 'VERIFICACAO_INDISPONIVEL'; end if;
  select * into v from public.verificacoes where id = verificacao_id and not demonstracao for update;
  if not found or v.verificado_em is not null then raise exception 'CODIGO_INVALIDO'; end if;
  if v.expira_em <= now() then raise exception 'CODIGO_EXPIRADO'; end if;
  if v.tentativas >= 5 then raise exception 'TENTATIVAS_ESGOTADAS'; end if;
  update public.verificacoes set tentativas = tentativas + 1 where id = v.id;
  return jsonb_build_object('canal', v.canal, 'contato', v.contato);
end;
$$;

create function public.emitir_prova_real(verificacao_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  nova_prova text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if not public.recebimento_real_disponivel() then raise exception 'VERIFICACAO_INDISPONIVEL'; end if;
  update public.verificacoes v
  set verificado_em = now(),
      prova_hash = encode(extensions.digest(nova_prova, 'sha256'), 'hex'),
      prova_expira_em = now() + interval '15 minutes'
  where v.id = verificacao_id and not v.demonstracao and v.expira_em > now()
    and v.verificado_em is null and v.tentativas between 1 and 5;
  if not found then raise exception 'CONTATO_NAO_VERIFICADO'; end if;
  return nova_prova;
end;
$$;

create function public.autorizar_foto_real(prova text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  caminho text;
begin
  if not public.recebimento_real_disponivel() then raise exception 'VERIFICACAO_INDISPONIVEL'; end if;
  if not coalesce(prova ~ '^[0-9a-f]{64}$', false) then raise exception 'CONTATO_NAO_VERIFICADO'; end if;
  update public.verificacoes v
  set foto_real_path = coalesce(v.foto_real_path, 'real/' || gen_random_uuid() || '.jpg')
  where v.prova_hash = encode(extensions.digest(prova, 'sha256'), 'hex')
    and not v.demonstracao and not v.prova_usada and v.prova_expira_em > now()
  returning foto_real_path into caminho;
  if not found then raise exception 'CONTATO_NAO_VERIFICADO'; end if;
  return caminho;
end;
$$;

create function public.gestor_pode_ler_foto(caminho text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.sou_gestor() and exists (
    select 1 from public.relatos r where r.foto_path = caminho
      and r.demonstracao = public.mappia_demonstracao_ativa()
  );
$$;

revoke all on function public.mappia_demonstracao_ativa(), public.recebimento_real_disponivel(),
  public.preparar_verificacao_real(text,text), public.registrar_tentativa_real(uuid),
  public.emitir_prova_real(uuid), public.autorizar_foto_real(text), public.gestor_pode_ler_foto(text)
from public, anon, authenticated;
grant execute on function public.recebimento_real_disponivel() to anon, authenticated, service_role;
grant execute on function public.preparar_verificacao_real(text,text), public.registrar_tentativa_real(uuid),
  public.emitir_prova_real(uuid), public.autorizar_foto_real(text) to service_role;
grant execute on function public.gestor_pode_ler_foto(text) to authenticated;

drop policy mappia_fotos_inserir on storage.objects;
alter policy mappia_fotos_gestor on storage.objects
using (bucket_id = 'fotos' and public.gestor_pode_ler_foto(name));

create or replace function public.criar_relato(
  prova text, categoria text, descricao text, referencia text, lat double precision,
  lng double precision, foto_path text, chave_idempotencia text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.verificacoes%rowtype;
  anterior public.relatos%rowtype;
  novo_id uuid;
  novo_protocolo text;
  dono uuid := auth.uid();
  token_secreto text;
  hash_prova text;
  assinatura text;
  demo boolean := public.mappia_demonstracao_ativa();
  hoje timestamptz := date_trunc('day', now(), 'America/Recife');
begin
  if not demo and not public.recebimento_real_disponivel() then
    raise exception 'VERIFICACAO_INDISPONIVEL';
  end if;
  if not coalesce(prova ~ '^[0-9a-f]{64}$', false) then
    raise exception 'CONTATO_NAO_VERIFICADO';
  end if;
  if not coalesce(
    chave_idempotencia ~ '^[0-9A-Za-z_-]{16,100}$' and char_length(btrim(descricao)) between 5 and 1000
    and char_length(btrim(referencia)) between 1 and 300 and lat between -90 and 90 and lng between -180 and 180
    and exists (select 1 from public.categorias c where c.id = $2), false
  ) then
    raise exception 'RELATO_INVALIDO';
  end if;

  hash_prova := encode(extensions.digest(prova, 'sha256'), 'hex');
  assinatura := encode(extensions.digest(jsonb_build_array(
    hash_prova, dono, categoria, btrim(descricao), btrim(referencia), lat, lng, foto_path
  )::text, 'sha256'), 'hex');

  -- A prova é aleatória e só o remetente a recebe. O hash gravado continua de uso único.
  if dono is null then
    token_secreto := encode(extensions.hmac('mappia:vinculo:v1:' || chave_idempotencia, prova, 'sha256'), 'hex');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(chave_idempotencia, 2));
  select * into anterior from public.relatos r where r.chave_idempotencia = $8;
  if found then
    if anterior.demonstracao <> demo or anterior.hash_requisicao <> assinatura then raise exception 'IDEMPOTENCIA_CONFLITO'; end if;
    -- Recupera o token apenas para a mesma requisição, antes do vínculo.
    if anterior.usuario_id is null and anterior.token_hash = encode(extensions.digest(token_secreto, 'sha256'), 'hex') then
      return jsonb_build_object('protocolo', anterior.protocolo, 'token', token_secreto);
    end if;
    return jsonb_build_object('protocolo', anterior.protocolo);
  end if;

  select * into v from public.verificacoes where prova_hash = hash_prova and demonstracao = demo for update;
  if not found or v.prova_usada or v.prova_expira_em <= now() then
    raise exception 'CONTATO_NAO_VERIFICADO';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v.canal || ':' || v.contato, 3));
  if (select count(*) from public.relatos r
      where r.canal = v.canal and r.contato = v.contato and r.demonstracao = demo and r.criado_em >= hoje) >= 10 then
    raise exception 'LIMITE_RELATOS';
  end if;

  if foto_path is not null and (
    (demo and foto_path !~ '^pendentes/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.jpg$')
    or (not demo and foto_path is distinct from v.foto_real_path)
    or not exists (select 1 from storage.objects where bucket_id = 'fotos' and name = foto_path)
    or exists (select 1 from public.relatos r where r.foto_path = $7)
  ) then
    raise exception 'FOTO_INVALIDA';
  end if;

  loop
    novo_protocolo := 'MAP-' || to_char(now() at time zone 'America/Recife', 'YYYY') || '-' ||
                      upper(encode(extensions.gen_random_bytes(4), 'hex'));
    insert into public.relatos (
      protocolo, categoria, descricao, referencia, lat, lng, foto_path, canal, contato,
      usuario_id, token_hash, chave_idempotencia, hash_requisicao, demonstracao
    ) values (
      novo_protocolo, $2, btrim($3), btrim($4), $5, $6, $7, v.canal, v.contato,
      dono, encode(extensions.digest(token_secreto, 'sha256'), 'hex'), $8, assinatura, demo
    )
    on conflict (protocolo) do nothing returning id into novo_id;
    exit when novo_id is not null;
  end loop;

  update public.verificacoes set prova_usada = true where id = v.id;
  insert into public.historico_etapas (relato_id, para) values (novo_id, 'recebida');
  return jsonb_strip_nulls(jsonb_build_object('protocolo', novo_protocolo, 'token', token_secreto));
end;
$$;

create or replace function public.consultar_protocolo(protocolo text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'protocolo', r.protocolo, 'categoria', r.categoria,
    'etapa', case r.etapa when 'recebida' then 'Em análise' when 'validada' then 'Validada'
                         when 'encaminhada' then 'Encaminhada ao órgão' when 'resolvida' then 'Resolvida'
                         else 'Rejeitada' end,
    'criado_em', r.criado_em, 'atualizado_em', r.atualizado_em,
    'historico', (select jsonb_agg(jsonb_build_object('etapa', h.para, 'criado_em', h.criado_em) order by h.id)
                  from public.historico_etapas h where h.relato_id = r.id)
  )), '[]'::jsonb)
  from public.relatos r where r.demonstracao = public.mappia_demonstracao_ativa() and r.protocolo = upper(btrim($1));
$$;

create or replace function public.ocorrencias_publicas(categoria text default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'protocolo', r.protocolo, 'categoria', r.categoria, 'etapa', r.etapa,
    'lat', round(r.lat::numeric, 3), 'lng', round(r.lng::numeric, 3),
    'criado_em', r.criado_em
  ) order by r.criado_em desc, r.id), '[]'::jsonb)
  from public.relatos r
  where r.demonstracao = public.mappia_demonstracao_ativa() and r.etapa in ('validada', 'encaminhada', 'resolvida') and ($1 is null or r.categoria = $1);
$$;

create or replace function public.indicadores_publicos()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'validada', count(*) filter (where etapa = 'validada'),
    'encaminhada', count(*) filter (where etapa = 'encaminhada'),
    'resolvida', count(*) filter (where etapa = 'resolvida')
  ) from public.relatos r where r.demonstracao = public.mappia_demonstracao_ativa() and etapa in ('validada', 'encaminhada', 'resolvida');
$$;

create or replace function public.vincular_relatos(tokens text[])
returns int language plpgsql security definer set search_path = '' as $$
declare
  dono uuid := auth.uid();
  vinculados int;
begin
  if dono is null then raise exception 'SESSAO_NECESSARIA'; end if;
  if coalesce(cardinality(tokens), 0) > 100 then raise exception 'LIMITE_TOKENS'; end if;
  update public.relatos r set usuario_id = dono, token_hash = null
  where r.demonstracao = public.mappia_demonstracao_ativa() and r.usuario_id is null and r.token_hash in (
    select encode(extensions.digest(t, 'sha256'), 'hex')
    from unnest(tokens) as token(t) where t ~ '^[0-9a-f]{64}$'
  );
  get diagnostics vinculados = row_count;
  return vinculados;
end;
$$;

create or replace function public.meus_relatos()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'protocolo', r.protocolo, 'categoria', r.categoria, 'etapa', r.etapa,
    'criado_em', r.criado_em, 'atualizado_em', r.atualizado_em
  ) order by r.criado_em desc, r.id), '[]'::jsonb)
  from public.relatos r where r.demonstracao = public.mappia_demonstracao_ativa() and r.usuario_id = auth.uid();
$$;

create or replace function public.gestor_listar(periodo text default 'todos', categoria text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  dias int;
  inicio timestamptz;
begin
  if not public.sou_gestor() then raise exception 'ACESSO_GESTOR'; end if;
  dias := case periodo when 'hoje' then 0 when '7d' then 6 when '30d' then 29 else null end;
  if dias is null and periodo is distinct from 'todos' then raise exception 'PERIODO_INVALIDO'; end if;
  inicio := ((now() at time zone 'America/Recife')::date - dias)::timestamp at time zone 'America/Recife';
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'protocolo', r.protocolo, 'categoria', r.categoria, 'etapa', r.etapa,
      'referencia', r.referencia, 'lat', r.lat, 'lng', r.lng,
      'tem_foto', r.foto_path is not null,
      'criado_em', r.criado_em, 'atualizado_em', r.atualizado_em
    ) order by r.criado_em desc, r.id), '[]'::jsonb)
    from public.relatos r
    where r.demonstracao = public.mappia_demonstracao_ativa() and (inicio is null or r.criado_em >= inicio) and ($2 is null or r.categoria = $2)
  );
end;
$$;

create or replace function public.gestor_detalhe(id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.sou_gestor() then raise exception 'ACESSO_GESTOR'; end if;
  return (
    select (to_jsonb(r) - array['token_hash', 'hash_requisicao', 'chave_idempotencia'])
      || jsonb_build_object('historico',
        (select coalesce(jsonb_agg(to_jsonb(h) order by h.id), '[]'::jsonb)
         from public.historico_etapas h where h.relato_id = r.id))
    from public.relatos r where r.demonstracao = public.mappia_demonstracao_ativa() and r.id = $1
  );
end;
$$;

create or replace function public.gestor_alterar_etapa(id uuid, nova_etapa text, observacao text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  atual text;
begin
  if not public.sou_gestor() then raise exception 'ACESSO_GESTOR'; end if;
  select r.etapa into atual from public.relatos r where r.demonstracao = public.mappia_demonstracao_ativa() and r.id = $1 for update;
  if not found then raise exception 'RELATO_INEXISTENTE'; end if;
  if not coalesce(
    (atual = 'recebida' and nova_etapa in ('validada', 'rejeitada'))
    or (atual = 'validada' and nova_etapa in ('encaminhada', 'resolvida'))
    or (atual = 'encaminhada' and nova_etapa = 'resolvida'), false
  ) then
    raise exception 'TRANSICAO_INVALIDA';
  end if;
  if char_length(btrim(observacao)) > 1000 then raise exception 'OBSERVACAO_INVALIDA'; end if;

  update public.relatos r set etapa = nova_etapa, atualizado_em = now() where r.demonstracao = public.mappia_demonstracao_ativa() and r.id = $1;
  insert into public.historico_etapas (relato_id, de, para, observacao, gestor_id)
    values ($1, atual, nova_etapa, nullif(btrim($3), ''), auth.uid());
  return jsonb_build_object('id', $1, 'etapa', nova_etapa);
end;
$$;

-- O destino pode ser configurado e testado antes de abrir o recebimento ao público.
update public.configuracao set valor = 'false'::jsonb where chave = 'modo_apresentacao';
