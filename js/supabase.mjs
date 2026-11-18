import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const noPainel = /\/gestor(?:\/|$)/.test(location.pathname);
export const cliente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storageKey: noPainel ? 'mappia.gestor.auth' : 'mappia.morador.auth' }
});
export function conferir({ data, error }) {
  if (error) throw error;
  return data;
}
async function rpc(nome, args) {
  return conferir(await cliente.rpc(nome, args));
}
export const iniciarVerificacao = args => rpc('iniciar_verificacao', args);
export async function confirmarCodigo(args) {
  const resposta = await rpc('confirmar_codigo', args);
  if (resposta.erro) throw new Error(resposta.erro);
  return resposta.prova;
}
export const criarRelato = args => rpc('criar_relato', args);
export const consultarProtocolo = protocolo => rpc('consultar_protocolo', { protocolo });
export const ocorrenciasPublicas = categoria => rpc('ocorrencias_publicas', { categoria });
export const indicadoresPublicos = () => rpc('indicadores_publicos');
export const vincularRelatos = tokens => rpc('vincular_relatos', { tokens });
export const meusRelatos = () => rpc('meus_relatos');
export const souGestor = () => rpc('sou_gestor');
export const gestorListar = (periodo, categoria) => rpc('gestor_listar', { periodo, categoria });
export const gestorDetalhe = id => rpc('gestor_detalhe', { id });
export const alterarEtapa = args => rpc('gestor_alterar_etapa', args);

export async function subirFoto(path, arquivo) {
  return conferir(await cliente.storage.from('fotos').upload(path, arquivo, { contentType: 'image/jpeg' }));
}
export async function urlDaFoto(path) {
  return conferir(await cliente.storage.from('fotos').createSignedUrl(path, 300)).signedUrl;
}
