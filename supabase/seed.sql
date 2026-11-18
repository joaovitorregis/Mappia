begin;

with exemplos(categoria, referencia, lat, lng, caminho) as (
  values
    ('buracos', 'Centro · trecho fictício A', -7.2208, -35.8842, array['recebida']),
    ('lixo', 'Prata · trecho fictício B', -7.2169, -35.8971, array['recebida']),
    ('iluminacao', 'Bodocongó · trecho fictício C', -7.2165, -35.9232, array['recebida']),
    ('vazamentos', 'Catolé · trecho fictício D', -7.2412, -35.8787, array['recebida','validada']),
    ('alagamentos', 'Liberdade · trecho fictício E', -7.2418, -35.9001, array['recebida','validada']),
    ('outro', 'São José · trecho fictício F', -7.2284, -35.8831, array['recebida','validada']),
    ('buracos', 'Alto Branco · trecho fictício G', -7.2046, -35.8786, array['recebida','validada','encaminhada']),
    ('lixo', 'José Pinheiro · trecho fictício H', -7.2272, -35.8669, array['recebida','validada','encaminhada']),
    ('iluminacao', 'Palmeira · trecho fictício I', -7.2094, -35.8907, array['recebida','validada','encaminhada']),
    ('vazamentos', 'Estação Velha · trecho fictício J', -7.2331, -35.8869, array['recebida','validada','resolvida']),
    ('alagamentos', 'Malvinas · trecho fictício K', -7.2367, -35.9374, array['recebida','validada','encaminhada','resolvida']),
    ('outro', 'Santa Rosa · trecho fictício L', -7.2311, -35.9163, array['recebida','validada','resolvida']),
    ('buracos', 'Jardim Paulistano · trecho fictício M', -7.2529, -35.8938, array['recebida','validada']),
    ('iluminacao', 'Itararé · trecho fictício N', -7.2523, -35.8748, array['recebida','rejeitada']),
    ('lixo', 'Cruzeiro · trecho fictício O', -7.2528, -35.9098, array['recebida','rejeitada'])
), numerados as (
  select e.*, row_number() over (order by referencia)::int as numero
  from exemplos e
), inseridos as (
  insert into public.relatos (
    protocolo, categoria, descricao, referencia, lat, lng, canal, contato,
    chave_idempotencia, hash_requisicao, etapa, criado_em, atualizado_em
  )
  select 'MAP-' || to_char(now() at time zone 'America/Recife', 'YYYY') || '-DE00' ||
           upper(lpad(to_hex(n.numero), 4, '0')),
    n.categoria, 'Ocorrência fictícia para a apresentação.', n.referencia, n.lat, n.lng,
    'email', 'demo-' || n.numero || '@example.com', 'seed-mappia-' || n.numero,
    'seed', n.caminho[cardinality(n.caminho)], now() - make_interval(days => n.numero), now()
  from numerados n
  where exists (select 1 from public.configuracao where chave = 'modo_apresentacao' and valor = 'true'::jsonb)
  on conflict (chave_idempotencia) do nothing
  returning id, chave_idempotencia, criado_em
)
insert into public.historico_etapas (relato_id, de, para, criado_em)
select i.id, n.caminho[p.posicao - 1], n.caminho[p.posicao], i.criado_em + make_interval(hours => p.posicao - 1)
from inseridos i
join numerados n on i.chave_idempotencia = 'seed-mappia-' || n.numero
cross join lateral generate_subscripts(n.caminho, 1) as p(posicao)
order by i.id, p.posicao;

commit;
