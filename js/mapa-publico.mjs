import { ocorrenciasPublicas, indicadoresPublicos } from './supabase.mjs';
import { categorias, nomeCategoria } from './categorias.mjs';
import { etapas, dataLocal } from './etapas.mjs';
import { centro, criarMapa, localizar } from './mapa-base.mjs';
import { linkProtocolo } from './protocolos.mjs';

const filtros = document.querySelector('#map-filters');
const status = document.querySelector('#map-status');
const gps = document.querySelector('#map-gps');
const retry = document.querySelector('#map-retry');
const mapaEl = document.querySelector('#mapa');
const navigation = document.querySelector('#map-navigation');
const inline = document.querySelector('#map-inline');
const dialog = document.querySelector('#map-dialog');
const expanded = document.querySelector('#map-expanded');
const abrir = document.querySelector('#map-expand');
const recentrar = document.querySelector('#map-recenter');
const localizacao = document.querySelector('#btn-localizacao');
const zoomIn = document.querySelector('#map-zoom-in');
const zoomOut = document.querySelector('#map-zoom-out');
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

function resumo(relato) {
  const card = document.createElement('article');
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

function mostrarPinos(ocorrencias) {
  const porPonto = new Map();
  for (const relato of ocorrencias) {
    const coordenadas = [relato.lat, relato.lng].join(',');
    if (!porPonto.has(coordenadas)) porPonto.set(coordenadas, []);
    porPonto.get(coordenadas).push(relato);
  }

  pinos.clearLayers();
  for (const grupo of porPonto.values()) {
    const primeiro = grupo[0];
    const varios = grupo.length > 1;
    const cor = varios ? '#165bb3' : categorias[primeiro.categoria]?.cor ?? '#506777';
    const rotulo = varios ? grupo.length + ' ocorrências neste ponto'
      : nomeCategoria(primeiro.categoria) + ' · ' + etapas[primeiro.etapa];
    const simbolo = document.createElement('span');
    simbolo.style.setProperty('--pin-color', cor);
    if (varios) simbolo.textContent = String(grupo.length);
    const marcador = window.L.marker([primeiro.lat, primeiro.lng], {
      alt: rotulo, title: rotulo,
      icon: window.L.divIcon({ className: 'map-pin', html: simbolo, iconSize: [36, 36] })
    });
    const conteudo = document.createElement('div');
    conteudo.className = 'map-popup';
    conteudo.append(...grupo.map(resumo));
    marcador.bindPopup(conteudo, { maxHeight: 175, maxWidth: 246, minWidth: 140 }).addTo(pinos);
  }
}

async function carregar() {
  const atual = ++versao;
  status.textContent = 'Carregando ocorrências…';
  retry.hidden = true;
  try {
    if (!mapa) {
      mapa = criarMapa(mapaEl, { touchZoom: true, zoomControl: false });
      const atualizarZoom = () => {
        zoomIn.disabled = mapa.getZoom() >= mapa.getMaxZoom();
        zoomOut.disabled = mapa.getZoom() <= mapa.getMinZoom();
      };
      mapa.on('zoomend zoomlevelschange', atualizarZoom);
      atualizarZoom();
      for (const botao of [abrir, recentrar, localizacao]) botao.disabled = false;
      pinos = window.L.layerGroup().addTo(mapa);
    }
    const [rows, counts] = await Promise.all([ocorrenciasPublicas(selecionada), indicadoresPublicos()]);
    if (atual !== versao) return;
    mostrarPinos(rows);
    for (const span of document.querySelectorAll('[data-contagem]')) span.textContent = counts[span.dataset.contagem];
    status.textContent = rows.length ? '' : 'Nenhuma ocorrência nesta categoria.';
  } catch {
    if (atual !== versao) return;
    status.textContent = 'Não foi possível carregar as ocorrências.';
    retry.hidden = false;
  }
}
retry.addEventListener('click', carregar);
zoomIn.addEventListener('click', () => mapa.zoomIn());
zoomOut.addEventListener('click', () => mapa.zoomOut());
localizacao.addEventListener('click', () => localizar(mapa, gps));
recentrar.addEventListener('click', () => {
  mapa.stop().closePopup().setView(centro, 13, { animate: false });
  gps.textContent = 'Mapa centralizado em Campina Grande.';
});

mapaEl.addEventListener('focusin', () => mapa?.scrollWheelZoom.enable());
mapaEl.addEventListener('focusout', event => {
  if (!dialog.open && !mapaEl.contains(event.relatedTarget)) mapa?.scrollWheelZoom.disable();
});

abrir.addEventListener('click', () => {
  abrir.hidden = true;
  expanded.append(navigation);
  dialog.showModal();
  mapa.invalidateSize({ animate: false });
  mapa.scrollWheelZoom.enable();
});
dialog.addEventListener('close', () => {
  inline.append(navigation);
  abrir.hidden = false;
  mapa.invalidateSize({ animate: false });
  mapa.scrollWheelZoom.disable();
  abrir.focus({ preventScroll: true });
});
carregar();
