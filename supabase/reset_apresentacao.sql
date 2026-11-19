-- Primeiro exclua os arquivos do bucket fotos no painel ou pela API de Storage.
begin;
do $$
begin
  if not exists (select 1 from public.configuracao
                 where chave = 'modo_apresentacao' and valor = 'true'::jsonb) then
    raise exception 'MODO_APRESENTACAO_DESATIVADO';
  end if;
  if exists (select 1 from storage.objects where bucket_id = 'fotos') then
    raise exception 'REMOVA_FOTOS_PELO_STORAGE_ANTES_DO_RESET';
  end if;
  if exists (select 1 from public.relatos where not demonstracao) then
    raise exception 'RESET_RECUSADO_EM_BASE_COM_RELATOS_REAIS';
  end if;
end;
$$;

-- O histórico dos relatos de demonstração é removido pela FK com cascade.
delete from public.relatos where demonstracao;
delete from public.verificacoes where demonstracao;
commit;
