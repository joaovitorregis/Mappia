import { cliente, conferir, meusRelatos, vincularRelatos } from './supabase.mjs';
import { etapas, dataLocal } from './etapas.mjs';
import { nomeCategoria } from './categorias.mjs';
import { linkProtocolo, protocolosSalvos } from './protocolos.mjs';
import { erroAmigavel } from './erros.mjs';

const status = document.querySelector('#meus-status');
const lista = document.querySelector('#meus-lista');
async function carregar() {
  const { session } = conferir(await cliente.auth.getSession());
  if (!session) { location.replace('conta.html'); return; }
  const tokens = protocolosSalvos().map(item => item.token).filter(token => typeof token === 'string');
  let total = 0;
  for (let inicio = 0; inicio < tokens.length; inicio += 100) {
    total += await vincularRelatos(tokens.slice(inicio, inicio + 100));
  }
  const relatos = await meusRelatos();
  for (const relato of relatos) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    const descricao = document.createElement('p');
    link.href = linkProtocolo(relato.protocolo);
    link.textContent = nomeCategoria(relato.categoria) + ' · ' + relato.protocolo;
    descricao.textContent = etapas[relato.etapa] + ' · ' + dataLocal(relato.criado_em);
    item.append(link, descricao);
    lista.append(item);
  }
  status.textContent = total === 1 ? '1 relato foi ligado à sua conta.' : total
    ? total + ' relatos foram ligados à sua conta.'
    : relatos.length ? '' : 'Você ainda não tem relatos vinculados.';
}
carregar().catch(error => { status.textContent = erroAmigavel(error); });
document.querySelector('#conta-sair').addEventListener('click', async () => {
  try {
    conferir(await cliente.auth.signOut({ scope: 'local' }));
    location.assign('index.html');
  } catch (error) {
    status.textContent = erroAmigavel(error);
  }
});
