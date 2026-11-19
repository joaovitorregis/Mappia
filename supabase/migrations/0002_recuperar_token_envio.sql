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

  -- A prova é aleatória e só o remetente a recebe. O hash gravado continua de uso único.
  if dono is null then
    token_secreto := encode(extensions.hmac('mappia:vinculo:v1:' || chave_idempotencia, prova, 'sha256'), 'hex');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(chave_idempotencia, 2));
  select * into anterior from public.relatos r where r.chave_idempotencia = $8;
  if found then
    if anterior.hash_requisicao <> assinatura then raise exception 'IDEMPOTENCIA_CONFLITO'; end if;
    -- Recupera o token apenas para a mesma requisição, antes do vínculo.
    if anterior.usuario_id is null and anterior.token_hash = encode(extensions.digest(token_secreto, 'sha256'), 'hex') then
      return jsonb_build_object('protocolo', anterior.protocolo, 'token', token_secreto);
    end if;
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
