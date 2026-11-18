import { TILE_URL } from './config.js';
export const centro = [-7.2307, -35.8811];
export function criarMapa(elemento, opcoes = {}) {
  const L = window.L;
  if (!L) throw new Error('O mapa está indisponível. Recarregue a página.');
  const mapa = L.map(elemento, { scrollWheelZoom: false, ...opcoes }).setView(centro, 13);
  L.tileLayer(TILE_URL, {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mapa);
  return mapa;
}

export function localizar(mapa, status, callback) {
  if (!navigator.geolocation) {
    status.textContent = 'A localização não está disponível neste navegador.';
    return;
  }
  status.textContent = 'Buscando sua localização…';
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    const ponto = { lat: coords.latitude, lng: coords.longitude };
    mapa.setView(ponto, 16);
    callback?.(ponto);
    status.textContent = 'Localização encontrada.';
  }, ({ code }) => {
    status.textContent = code === 1
      ? 'Permissão de localização negada. Escolha o ponto no mapa.'
      : 'Não foi possível encontrar sua localização. Escolha o ponto no mapa.';
  }, { timeout: 10000, maximumAge: 30000 });
}
