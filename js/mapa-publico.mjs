import { ocorrenciasPublicas, indicadoresPublicos } from './supabase.mjs';
import { categorias, nomeCategoria } from './categorias.mjs';
import { etapas, dataLocal } from './etapas.mjs';
import { criarMapa, localizar } from './mapa-base.mjs';
import { linkProtocolo } from './protocolos.mjs';

const filtros = document.querySelector('#map-filters');
const status = document.querySelector('#map-status');
const gps = document.querySelector('#map-gps');
const retry = document.querySelector('#map-retry');
let mapa, pinos;
let selecionada = null;
let versao = 0;
for (const [id, nome] of [[null, 'Todas'], ...Object.entries(categorias).map(([id, cat]) => [id, cat.nome])]) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'chip';
  botao.textContent = nome;
  botao.classList.toggle('active', !id);
  botao.setAttribute('aria-pressed', String(!id));
  botao.addEventListener('click', () => {
    selecionada = id;
    for (const item of filtros.children) {
      item.classList.toggle('active', item === botao);
      item.setAttribute('aria-pressed', String(item === botao));
    }
    carregar();
  });
  filtros.append(botao);
}

function popup(relato) {
  const card = document.createElement('div');
  const titulo = document.createElement('strong');
  titulo.textContent = nomeCategoria(relato.categoria);
  const info = document.createElement('p');
  info.textContent = [etapas[relato.etapa], relato.referencia, dataLocal(relato.criado_em)].join(' · ');
  const link = document.createElement('a');
  link.textContent = 'Ver acompanhamento';
  link.href = linkProtocolo(relato.protocolo);
  card.append(titulo, info, link);
  return card;
}
async function carregar() {
  const atual = ++versao;
  status.textContent = 'Carregando ocorrências…';
  retry.hidden = true;
  try {
    if (!mapa) {
      mapa = criarMapa(document.querySelector('#mapa'));
      pinos = window.L.layerGroup().addTo(mapa);
    }
    const [rows, counts] = await Promise.all([ocorrenciasPublicas(selecionada), indicadoresPublicos()]);
    if (atual !== versao) return;
    pinos.clearLayers();
    for (const row of rows) {
      const cor = categorias[row.categoria]?.cor ?? '#506777';
      const rotulo = nomeCategoria(row.categoria) + ' · ' + etapas[row.etapa];
      const marcador = window.L.marker([row.lat, row.lng], {
        alt: rotulo, title: rotulo,
        icon: window.L.divIcon({ className: 'map-pin', html: '<span style="--pin-color:' + cor + '"></span>', iconSize: [20, 20] })
      });
      marcador.bindPopup(popup(row)).addTo(pinos);
    }
    for (const span of document.querySelectorAll('[data-contagem]')) span.textContent = counts[span.dataset.contagem];
    status.textContent = rows.length ? '' : 'Nenhuma ocorrência nesta categoria.';
  } catch {
    if (atual !== versao) return;
    status.textContent = 'Não foi possível carregar as ocorrências.';
    retry.hidden = false;
  }
}
retry.addEventListener('click', carregar);
document.querySelector('#btn-localizacao').addEventListener('click', () => { if (mapa) localizar(mapa, gps); });
carregar();
