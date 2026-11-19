import { SUPABASE_URL } from './config.js?v=10';
const chave = 'mappia:' + SUPABASE_URL + ':real:meusRelatos';
export function protocolosSalvos() {
  try {
    const itens = JSON.parse(localStorage.getItem(chave) ?? '[]');
    return Array.isArray(itens) ? itens.filter(item => typeof item?.protocolo === 'string') : [];
  } catch {
    return [];
  }
}
export function guardarProtocolo(item) {
  const itens = protocolosSalvos();
  if (itens.some(atual => atual.protocolo === item.protocolo)) return;
  localStorage.setItem(chave, JSON.stringify([item, ...itens]));
}
export const linkProtocolo = protocolo => 'acompanhar.html?p=' + encodeURIComponent(protocolo);
