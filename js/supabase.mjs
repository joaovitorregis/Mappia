import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=10';

const noPainel = /\/gestor(?:\/|$)/.test(location.pathname);
export const cliente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storageKey: 'mappia:' + SUPABASE_URL + ':real:' + (noPainel ? 'gestor' : 'morador') }
});
export function conferir({ data, error }) {
  if (error) throw error;
  return data;
}
async function rpc(nome, args) {
  return conferir(await cliente.rpc(nome, args));
}
export const recebimentoRealDisponivel = () => rpc('recebimento_real_disponivel');
export const criarRelato = args => rpc('criar_relato', args);
export const consultarProtocolo = protocolo => rpc('consultar_protocolo', { protocolo });
export async function ocorrenciasPublicas(categoria, signal) {
  let query = cliente.rpc('ocorrencias_publicas', { categoria });
  if (signal) query = query.abortSignal(signal);
  return conferir(await query);
}
export const indicadoresPublicos = () => rpc('indicadores_publicos');
export const vincularRelatos = tokens => rpc('vincular_relatos', { tokens });
export const meusRelatos = () => rpc('meus_relatos');
export const souGestor = () => rpc('sou_gestor');
export const gestorListar = (periodo, categoria) => rpc('gestor_listar', { periodo, categoria });
export const gestorDetalhe = id => rpc('gestor_detalhe', { id });
export const alterarEtapa = args => rpc('gestor_alterar_etapa', args);

export async function verificarContato(body) {
  const { data, error } = await cliente.functions.invoke('contato-verificacao', { body });
  if (error) {
    let resposta;
    if (error.context instanceof Response) {
      try { resposta = await error.context.json(); } catch { /* resposta fora do contrato */ }
    }
    throw new Error(resposta?.erro ?? 'VERIFICACAO_INDISPONIVEL');
  }
  if (data?.erro) throw new Error(data.erro);
  return data;
}
export async function subirFoto({ path, token }, arquivo) {
  return conferir(await cliente.storage.from('fotos').uploadToSignedUrl(path, token, arquivo, { contentType: 'image/jpeg' }));
}
export async function urlDaFoto(path) {
  return conferir(await cliente.storage.from('fotos').createSignedUrl(path, 300)).signedUrl;
}
