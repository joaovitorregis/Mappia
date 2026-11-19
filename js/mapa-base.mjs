import { TILE_URL } from './config.js';
export const centro = [-7.2307, -35.8811];
export function criarMapa(elemento, opcoes = {}) {
  const L = window.L;
  if (!L) throw new Error('O mapa está indisponível. Recarregue a página.');
  const mapa = L.map(elemento, { scrollWheelZoom: false, ...opcoes }).setView(centro, 13);
  const tiles = L.tileLayer(TILE_URL, {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });
  const aviso = document.createElement('div');
  aviso.className = 'mapa-falha';
  aviso.hidden = true;
  const mensagem = document.createElement('span');
  mensagem.setAttribute('role', 'status');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Tentar carregar de novo';
  aviso.append(mensagem, retry);
  L.DomEvent.disableClickPropagation(aviso);
  L.DomEvent.disableScrollPropagation(aviso);
  const controle = L.control({ position: 'bottomleft' });
  controle.onAdd = () => aviso;
  controle.addTo(mapa);
  let houveFalha = false;
  tiles.on('loading', () => { houveFalha = false; });
  tiles.on('tileerror', () => { houveFalha = true; });
  tiles.on('load', () => {
    aviso.hidden = !houveFalha;
    mensagem.textContent = !houveFalha ? '' : temCartografia(mapa)
      ? 'Parte do mapa não carregou.' : 'O fundo do mapa não carregou.';
    retry.disabled = false;
  });
  retry.addEventListener('click', () => {
    retry.disabled = true;
    mensagem.textContent = 'Carregando o fundo do mapa…';
    tiles.redraw();
  });
  tiles.addTo(mapa);
  return mapa;
}

export function temCartografia(mapa) {
  return [...mapa.getContainer().querySelectorAll('.leaflet-tile-loaded')]
    .some(tile => tile.complete && tile.naturalWidth > 0);
}

export function localizar(mapa, status, callback, aindaSolicitada = () => true) {
  if (!navigator.geolocation) {
    status.textContent = 'A localização não está disponível neste navegador.';
    return;
  }
  status.textContent = 'Buscando sua localização…';
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    if (!aindaSolicitada()) return;
    const ponto = { lat: coords.latitude, lng: coords.longitude };
    mapa.setView(ponto, 16);
    callback?.(ponto);
    status.textContent = 'Localização encontrada.';
  }, ({ code }) => {
    if (!aindaSolicitada()) return;
    status.textContent = code === 1
      ? 'Permissão de localização negada. Escolha o ponto no mapa.'
      : 'Não foi possível encontrar sua localização. Escolha o ponto no mapa.';
  }, { timeout: 10000, maximumAge: 30000 });
}
