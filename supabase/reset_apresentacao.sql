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
end;
$$;

delete from public.historico_etapas;
delete from public.relatos;
delete from public.verificacoes;
commit;
