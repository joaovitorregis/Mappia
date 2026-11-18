create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.categorias (id text primary key, nome text not null);
insert into public.categorias values
  ('buracos', 'Buracos na rua'),
  ('iluminacao', 'Iluminação pública'),
  ('lixo', 'Lixo e descarte irregular'),
  ('vazamentos', 'Vazamentos e esgoto a céu aberto'),
  ('alagamentos', 'Alagamentos'),
  ('outro', 'Outro problema');

create table public.gestores (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.configuracao (chave text primary key, valor jsonb not null);
insert into public.configuracao values ('modo_apresentacao', 'true');

create table public.verificacoes (
  id uuid primary key default gen_random_uuid(),
  canal text not null check (canal in ('email', 'telefone')),
  contato text not null,
  codigo_hash text not null,
  tentativas int not null default 0 check (tentativas between 0 and 5),
  expira_em timestamptz not null,
  verificado_em timestamptz,
  prova_hash text unique,
  prova_expira_em timestamptz,
  prova_usada boolean not null default false,
  criado_em timestamptz not null default now()
);

create table public.relatos (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique check (protocolo ~ '^MAP-[0-9]{4}-[0-9A-F]{8}$'),
  categoria text not null references public.categorias(id),
  descricao text not null check (char_length(descricao) between 5 and 1000),
  referencia text not null check (char_length(referencia) between 1 and 300),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  foto_path text unique,
  canal text not null check (canal in ('email', 'telefone')),
  contato text not null,
  usuario_id uuid references auth.users(id) on delete set null,
  token_hash text unique,
  chave_idempotencia text not null unique,
  hash_requisicao text not null,
  etapa text not null default 'recebida' check (etapa in ('recebida', 'validada', 'encaminhada', 'resolvida', 'rejeitada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.historico_etapas (
  id bigserial primary key,
  relato_id uuid not null references public.relatos(id) on delete cascade,
  de text check (de in ('recebida', 'validada', 'encaminhada', 'resolvida', 'rejeitada')),
  para text not null check (para in ('recebida', 'validada', 'encaminhada', 'resolvida', 'rejeitada')),
  observacao text check (char_length(observacao) <= 1000),
  gestor_id uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index on public.verificacoes (canal, contato, criado_em);
create index on public.relatos (canal, contato, criado_em);
create index on public.relatos (usuario_id, criado_em);
create index on public.historico_etapas (relato_id, id);

alter table public.categorias enable row level security;
alter table public.gestores enable row level security;
alter table public.configuracao enable row level security;
alter table public.verificacoes enable row level security;
alter table public.relatos enable row level security;
alter table public.historico_etapas enable row level security;
revoke all on public.categorias, public.gestores, public.configuracao, public.verificacoes,
  public.relatos, public.historico_etapas, public.historico_etapas_id_seq from public, anon, authenticated;

create function public.iniciar_verificacao(canal text, contato text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  contato_normalizado text := lower(btrim(contato));
  codigo text;
  novo_id uuid := gen_random_uuid();
begin
  if canal = 'telefone' then
    contato_normalizado := regexp_replace(contato_normalizado, '[ ()-]', '', 'g');
  end if;
  if not coalesce(
    (canal = 'email' and char_length(contato_normalizado) <= 254
      and contato_normalizado ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (canal = 'telefone' and contato_normalizado ~ '^[0-9]{10,11}$'), false
  ) then
    raise exception 'CONTATO_INVALIDO';
  end if;
  if not exists (select 1 from public.configuracao
                 where chave = 'modo_apresentacao' and valor = 'true'::jsonb) then
    raise exception 'VERIFICACAO_INDISPONIVEL';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(canal || ':' || contato_normalizado, 1));
  if (select count(*) from public.verificacoes v
      where v.canal = $1 and v.contato = contato_normalizado
        and v.criado_em >= now() - interval '1 hour') >= 5 then
    raise exception 'LIMITE_CODIGOS';
  end if;

  codigo := lpad((floor(random() * 1000000)::int)::text, 6, '0');
  insert into public.verificacoes (id, canal, contato, codigo_hash, expira_em)
  values (novo_id, canal, contato_normalizado,
          encode(extensions.digest(novo_id::text || ':' || codigo, 'sha256'), 'hex'),
          now() + interval '10 minutes');
  return jsonb_build_object('verificacao_id', novo_id, 'codigo_demo', codigo);
end;
$$;

create function public.confirmar_codigo(verificacao_id uuid, codigo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.verificacoes%rowtype;
  prova text;
begin
  if not exists (select 1 from public.configuracao
                 where chave = 'modo_apresentacao' and valor = 'true'::jsonb) then
    raise exception 'VERIFICACAO_INDISPONIVEL';
  end if;
  select * into v from public.verificacoes where id = verificacao_id for update;
  if not found or v.verificado_em is not null then
    return jsonb_build_object('erro', 'CODIGO_INVALIDO');
  elsif v.expira_em <= now() then
    return jsonb_build_object('erro', 'CODIGO_EXPIRADO');
  elsif v.tentativas >= 5 then
    return jsonb_build_object('erro', 'TENTATIVAS_ESGOTADAS');
  end if;

  if codigo is null or codigo !~ '^[0-9]{6}$'
     or v.codigo_hash <> encode(extensions.digest(verificacao_id::text || ':' || codigo, 'sha256'), 'hex') then
    -- Retornar erro como dado mantém a tentativa gravada na mesma transação.
    update public.verificacoes set tentativas = tentativas + 1 where id = v.id;
    return jsonb_build_object('erro', case when v.tentativas = 4 then 'TENTATIVAS_ESGOTADAS'
                                          else 'CODIGO_INVALIDO' end);
  end if;

  prova := encode(extensions.gen_random_bytes(32), 'hex');
  update public.verificacoes
  set verificado_em = now(), prova_hash = encode(extensions.digest(prova, 'sha256'), 'hex'),
      prova_expira_em = now() + interval '15 minutes'
  where id = v.id;
  return jsonb_build_object('prova', prova);
end;
$$;

create function public.criar_relato(
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
  hoje timestamptz := date_trunc('day', now(), 'America/Recife');
begin
  if not exists (select 1 from public.configuracao
                 where chave = 'modo_apresentacao' and valor = 'true'::jsonb) then
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

  perform pg_advisory_xact_lock(hashtextextended(chave_idempotencia, 2));
  select * into anterior from public.relatos r where r.chave_idempotencia = $8;
  if found then
    if anterior.hash_requisicao <> assinatura then raise exception 'IDEMPOTENCIA_CONFLITO'; end if;
    return jsonb_build_object('protocolo', anterior.protocolo);
  end if;

  select * into v from public.verificacoes where prova_hash = hash_prova for update;
  if not found or v.prova_usada or v.prova_expira_em <= now() then
    raise exception 'CONTATO_NAO_VERIFICADO';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v.canal || ':' || v.contato, 3));
  if (select count(*) from public.relatos r
      where r.canal = v.canal and r.contato = v.contato and r.criado_em >= hoje) >= 10 then
    raise exception 'LIMITE_RELATOS';
  end if;

  if foto_path is not null and (
    foto_path !~ '^pendentes/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.jpg$'
    or not exists (select 1 from storage.objects where bucket_id = 'fotos' and name = foto_path)
    or exists (select 1 from public.relatos r where r.foto_path = $7)
  ) then
    raise exception 'FOTO_INVALIDA';
  end if;

  if dono is null then token_secreto := encode(extensions.gen_random_bytes(32), 'hex'); end if;
  loop
    novo_protocolo := 'MAP-' || to_char(now() at time zone 'America/Recife', 'YYYY') || '-' ||
                      upper(encode(extensions.gen_random_bytes(4), 'hex'));
    insert into public.relatos (
      protocolo, categoria, descricao, referencia, lat, lng, foto_path, canal, contato,
      usuario_id, token_hash, chave_idempotencia, hash_requisicao
    ) values (
      novo_protocolo, $2, btrim($3), btrim($4), $5, $6, $7, v.canal, v.contato,
      dono, encode(extensions.digest(token_secreto, 'sha256'), 'hex'), $8, assinatura
    )
    on conflict (protocolo) do nothing returning id into novo_id;
    exit when novo_id is not null;
  end loop;

  update public.verificacoes set prova_usada = true where id = v.id;
  insert into public.historico_etapas (relato_id, para) values (novo_id, 'recebida');
  return jsonb_strip_nulls(jsonb_build_object('protocolo', novo_protocolo, 'token', token_secreto));
end;
$$;

create function public.consultar_protocolo(protocolo text)
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
  from public.relatos r where r.protocolo = upper(btrim($1));
$$;

create function public.ocorrencias_publicas(categoria text default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'protocolo', r.protocolo, 'categoria', r.categoria, 'etapa', r.etapa,
    'lat', round(r.lat::numeric, 3), 'lng', round(r.lng::numeric, 3),
    'referencia', r.referencia, 'criado_em', r.criado_em
  ) order by r.criado_em desc, r.id), '[]'::jsonb)
  from public.relatos r
  where r.etapa in ('validada', 'encaminhada', 'resolvida') and ($1 is null or r.categoria = $1);
$$;

create function public.indicadores_publicos()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'validada', count(*) filter (where etapa = 'validada'),
    'encaminhada', count(*) filter (where etapa = 'encaminhada'),
    'resolvida', count(*) filter (where etapa = 'resolvida')
  ) from public.relatos where etapa in ('validada', 'encaminhada', 'resolvida');
$$;

create function public.vincular_relatos(tokens text[])
returns int language plpgsql security definer set search_path = '' as $$
declare
  dono uuid := auth.uid();
  vinculados int;
begin
  if dono is null then raise exception 'SESSAO_NECESSARIA'; end if;
  if coalesce(cardinality(tokens), 0) > 100 then raise exception 'LIMITE_TOKENS'; end if;
  update public.relatos r set usuario_id = dono, token_hash = null
  where r.usuario_id is null and r.token_hash in (
    select encode(extensions.digest(t, 'sha256'), 'hex')
    from unnest(tokens) as token(t) where t ~ '^[0-9a-f]{64}$'
  );
  get diagnostics vinculados = row_count;
  return vinculados;
end;
$$;

create function public.meus_relatos()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'protocolo', r.protocolo, 'categoria', r.categoria, 'etapa', r.etapa,
    'criado_em', r.criado_em, 'atualizado_em', r.atualizado_em
  ) order by r.criado_em desc, r.id), '[]'::jsonb)
  from public.relatos r where r.usuario_id = auth.uid();
$$;

create function public.sou_gestor()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.gestores where user_id = auth.uid());
$$;

create function public.gestor_listar(periodo text default 'todos', categoria text default null)
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
      'descricao', r.descricao, 'referencia', r.referencia, 'lat', r.lat, 'lng', r.lng,
      'tem_foto', r.foto_path is not null, 'canal', r.canal, 'contato', r.contato,
      'criado_em', r.criado_em, 'atualizado_em', r.atualizado_em
    ) order by r.criado_em desc, r.id), '[]'::jsonb)
    from public.relatos r
    where (inicio is null or r.criado_em >= inicio) and ($2 is null or r.categoria = $2)
  );
end;
$$;

create function public.gestor_detalhe(id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.sou_gestor() then raise exception 'ACESSO_GESTOR'; end if;
  return (
    select (to_jsonb(r) - array['token_hash', 'hash_requisicao', 'chave_idempotencia'])
      || jsonb_build_object('historico',
        (select coalesce(jsonb_agg(to_jsonb(h) order by h.id), '[]'::jsonb)
         from public.historico_etapas h where h.relato_id = r.id))
    from public.relatos r where r.id = $1
  );
end;
$$;

create function public.gestor_alterar_etapa(id uuid, nova_etapa text, observacao text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  atual text;
begin
  if not public.sou_gestor() then raise exception 'ACESSO_GESTOR'; end if;
  select r.etapa into atual from public.relatos r where r.id = $1 for update;
  if not found then raise exception 'RELATO_INEXISTENTE'; end if;
  if not coalesce(
    (atual = 'recebida' and nova_etapa in ('validada', 'rejeitada'))
    or (atual = 'validada' and nova_etapa in ('encaminhada', 'resolvida'))
    or (atual = 'encaminhada' and nova_etapa = 'resolvida'), false
  ) then
    raise exception 'TRANSICAO_INVALIDA';
  end if;
  if char_length(btrim(observacao)) > 1000 then raise exception 'OBSERVACAO_INVALIDA'; end if;

  update public.relatos r set etapa = nova_etapa, atualizado_em = now() where r.id = $1;
  insert into public.historico_etapas (relato_id, de, para, observacao, gestor_id)
    values ($1, atual, nova_etapa, nullif(btrim($3), ''), auth.uid());
  return jsonb_build_object('id', $1, 'etapa', nova_etapa);
end;
$$;

revoke execute on function
  public.iniciar_verificacao(text, text), public.confirmar_codigo(uuid, text),
  public.criar_relato(text, text, text, text, double precision, double precision, text, text),
  public.consultar_protocolo(text), public.ocorrencias_publicas(text), public.indicadores_publicos(),
  public.vincular_relatos(text[]), public.meus_relatos(), public.sou_gestor(),
  public.gestor_listar(text, text), public.gestor_detalhe(uuid), public.gestor_alterar_etapa(uuid, text, text)
from public, anon, authenticated;

grant execute on function
  public.iniciar_verificacao(text, text), public.confirmar_codigo(uuid, text),
  public.criar_relato(text, text, text, text, double precision, double precision, text, text),
  public.consultar_protocolo(text), public.ocorrencias_publicas(text), public.indicadores_publicos()
to anon, authenticated;

grant execute on function
  public.vincular_relatos(text[]), public.meus_relatos(), public.sou_gestor(),
  public.gestor_listar(text, text), public.gestor_detalhe(uuid), public.gestor_alterar_etapa(uuid, text, text)
to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy mappia_fotos_inserir on storage.objects for insert to anon, authenticated
with check (bucket_id = 'fotos'
  and name ~ '^pendentes/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.jpg$');

create policy mappia_fotos_gestor on storage.objects for select to authenticated
using (bucket_id = 'fotos' and (select public.sou_gestor()));
