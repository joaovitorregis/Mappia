import { consultarProtocolo } from './supabase.mjs?v=10';
import { nomeCategoria } from './categorias.mjs';
import { dataLocal, etapas } from './etapas.mjs';
import { linkProtocolo, protocolosSalvos } from './protocolos.mjs?v=10';
import { erroAmigavel } from './erros.mjs?v=10';

const form = document.querySelector('#consulta-protocolo');
const campo = form.elements.protocolo;
const status = document.querySelector('#nao-encontrado');
const resultado = document.querySelector('#resultado');
let consulta = 0;
async function buscar() {
  const versao = ++consulta;
  resultado.hidden = true;
  status.hidden = false;
  status.textContent = 'Buscando protocolo…';
  try {
    const [relato] = await consultarProtocolo(campo.value.trim());
    if (versao !== consulta) return;
    if (!relato) {
      status.textContent = 'Não encontramos esse protocolo. Confira se digitou certo.';
      return;
    }
    document.querySelector('#result-status').textContent = relato.etapa;
    document.querySelector('#result-category').textContent = nomeCategoria(relato.categoria);
    document.querySelector('#result-protocol').textContent = relato.protocolo;
    const lista = document.querySelector('#result-history');
    lista.replaceChildren();
    for (const evento of relato.historico ?? []) {
      const item = document.createElement('li');
      item.textContent = etapas[evento.etapa] + ' · ' + dataLocal(evento.criado_em);
      lista.append(item);
    }
    document.querySelector('#result-rejection').hidden = relato.etapa !== etapas.rejeitada;
    status.hidden = true;
    resultado.hidden = false;
  } catch (error) {
    if (versao === consulta) status.textContent = erroAmigavel(error);
  }
}
form.addEventListener('submit', event => { event.preventDefault(); buscar(); });
const salvos = document.querySelector('#protocolos-salvos');
for (const { protocolo } of protocolosSalvos()) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.href = linkProtocolo(protocolo);
  link.textContent = protocolo;
  item.append(link);
  salvos.append(item);
}
salvos.closest('section').hidden = salvos.childElementCount === 0;
const params = new URLSearchParams(location.search);
const protocolo = params.get('p') ?? params.get('protocolo');
if (protocolo) { campo.value = protocolo; buscar(); }
