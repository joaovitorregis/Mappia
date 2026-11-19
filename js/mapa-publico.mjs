import { ocorrenciasPublicas } from './supabase.mjs?v=10';
import { categorias, nomeCategoria } from './categorias.mjs';
import { etapas } from './etapas.mjs';
import { centro, criarMapa, localizar } from './mapa-base.mjs?v=10';
import { linkProtocolo } from './protocolos.mjs?v=10';

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
const intervaloAtualizacao = 15_000;
const marcadores = new Map();
let mapa, pinos;
let ocorrencias = null;
let selecionada = null;
let consultando = false;
let falha = false;
let proximaConsulta;
let pedidoGps = 0;
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
    if (ocorrencias) atualizarVista();
  });
  filtros.append(botao);
}

function resumo(relato) {
  const card = document.createElement('article');
  const titulo = document.createElement('strong');
  titulo.textContent = nomeCategoria(relato.categoria);
  const info = document.createElement('p');
  info.textContent = etapas[relato.etapa];
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

  for (const [ponto, { marcador }] of marcadores) {
    if (porPonto.has(ponto)) continue;
    pinos.removeLayer(marcador);
    marcadores.delete(ponto);
  }

  for (const [ponto, grupo] of porPonto) {
    const assinatura = JSON.stringify(grupo);
    const existente = marcadores.get(ponto);
    if (existente?.assinatura === assinatura) continue;

    const primeiro = grupo[0];
    const varios = grupo.length > 1;
    const cor = varios ? '#165bb3' : categorias[primeiro.categoria]?.cor ?? '#506777';
    const rotulo = varios ? grupo.length + ' ocorrências neste ponto'
      : nomeCategoria(primeiro.categoria) + ' · ' + etapas[primeiro.etapa];
    const simbolo = document.createElement('span');
    simbolo.style.setProperty('--pin-color', cor);
    if (varios) simbolo.textContent = String(grupo.length);
    const icon = window.L.divIcon({ className: 'map-pin', html: simbolo, iconSize: [36, 36] });
    const conteudo = document.createElement('div');
    conteudo.className = 'map-popup';
    conteudo.append(...grupo.map(resumo));
    if (existente) {
      const { marcador } = existente;
      marcador.options.title = rotulo;
      marcador.options.alt = rotulo;
      marcador.setIcon(icon);
      marcador.getElement().title = rotulo;
      const popup = marcador.getPopup();
      // Atualizar um cartão aberto sem deslocar a vista.
      popup.options.autoPan = false;
      marcador.setPopupContent(conteudo);
      popup.options.autoPan = true;
      marcador.getElement().setAttribute('aria-label', rotulo);
      existente.assinatura = assinatura;
    } else {
      const marcador = window.L.marker([primeiro.lat, primeiro.lng], { alt: rotulo, title: rotulo, icon });
      marcador.bindPopup(conteudo, { maxHeight: 175, maxWidth: 246, minWidth: 140 }).addTo(pinos);
      marcador.getElement().setAttribute('aria-label', rotulo);
      marcadores.set(ponto, { marcador, assinatura });
    }
  }
}

function atualizarVista() {
  const visiveis = selecionada ? ocorrencias.filter(row => row.categoria === selecionada) : ocorrencias;
  mostrarPinos(visiveis);
  const contagens = { validada: 0, encaminhada: 0, resolvida: 0 };
  for (const row of ocorrencias) {
    if (Object.hasOwn(contagens, row.etapa)) contagens[row.etapa]++;
  }
  for (const span of document.querySelectorAll('[data-contagem]')) {
    const valor = String(contagens[span.dataset.contagem]);
    if (span.textContent !== valor) span.textContent = valor;
  }
  if (!falha) status.textContent = visiveis.length ? '' : 'Nenhuma ocorrência nesta categoria.';
}

async function carregar() {
  if (consultando || document.hidden) return;
  clearTimeout(proximaConsulta);
  consultando = true;
  retry.disabled = true;
  if (!ocorrencias) status.textContent = 'Carregando ocorrências…';
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 10_000);
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
    ocorrencias = await ocorrenciasPublicas(null, controle.signal);
    falha = false;
    atualizarVista();
    retry.hidden = true;
  } catch {
    falha = true;
    status.textContent = ocorrencias
      ? 'Sem atualização no momento. O mapa mostra os últimos dados recebidos.'
      : 'Não foi possível carregar as ocorrências.';
    retry.hidden = false;
  } finally {
    clearTimeout(limite);
    consultando = false;
    retry.disabled = false;
    if (!document.hidden) proximaConsulta = setTimeout(carregar, intervaloAtualizacao);
  }
}
retry.addEventListener('click', carregar);
window.addEventListener('online', carregar);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(proximaConsulta);
  else carregar();
});
zoomIn.addEventListener('click', () => mapa.zoomIn());
zoomOut.addEventListener('click', () => mapa.zoomOut());
localizacao.addEventListener('click', () => {
  const pedido = ++pedidoGps;
  localizar(mapa, gps, undefined, () => pedido === pedidoGps);
});
recentrar.addEventListener('click', () => {
  pedidoGps++;
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
