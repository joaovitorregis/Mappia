import { cliente, conferir, souGestor, gestorListar, gestorDetalhe, alterarEtapa, urlDaFoto } from './supabase.mjs?v=10';
import { preencherCategorias, nomeCategoria } from './categorias.mjs';
import { etapas, transicoes, dataLocal } from './etapas.mjs';
import { erroAmigavel } from './erros.mjs?v=10';
import { criarMapa } from './mapa-base.mjs?v=10';
import { TURNSTILE_SITE_KEY } from './config.js?v=10';
import { montarTurnstile } from './turnstile.mjs';

const el = id => document.getElementById(id);
const status = el('gestor-status');
const login = el('gestor-form');
const filtros = el('gestor-filtros');
const detalhe = el('gestor-detalhe');
const painel = el('gestor-painel');
const lista = el('gestor-lista');
const mapaEl = el('gestor-mapa');
const etapaForm = el('gestor-etapa');
let selecionado, listaAtual = [], mapa, pontos, local, localPino;
let pedido = 0, pedidoDetalhe = 0;
let consultaEmCurso = 0, ultimaLista;
const loginBotao = login.querySelector('button');
const loginSeguranca = el('gestor-seguranca-status');
let captcha, loginEmCurso = false;
preencherCategorias(filtros.elements.categoria);

function atualizarLogin(pronto = !TURNSTILE_SITE_KEY || Boolean(captcha?.token)) {
  loginBotao.disabled = loginEmCurso || !pronto;
}
if (TURNSTILE_SITE_KEY) {
  atualizarLogin();
  loginSeguranca.textContent = 'Carregando verificação de segurança…';
  montarTurnstile(el('gestor-seguranca'), 'gestor-acesso', pronto => {
    atualizarLogin(pronto);
    if (pronto) loginSeguranca.textContent = '';
  }, () => { loginSeguranca.textContent = 'A verificação de segurança falhou. Tente novamente.'; })
    .then(widget => { captcha = widget; atualizarLogin(); })
    .catch(() => {
      loginSeguranca.textContent = 'Não foi possível carregar a verificação de segurança. Atualize a página.';
    });
}

function mostrarPainel() {
  el('gestor-login').hidden = true;
  detalhe.hidden = true;
  painel.hidden = false;
}
async function conferirSessao() {
  const { session } = conferir(await cliente.auth.getSession());
  if (!session) return false;
  if (!(await souGestor())) {
    conferir(await cliente.auth.signOut({ scope: 'local' }));
    status.textContent = 'Esta conta não tem acesso ao painel.';
    return false;
  }
  mostrarPainel();
  await carregar();
  return true;
}
login.addEventListener('submit', async event => {
  event.preventDefault();
  if (loginEmCurso || (TURNSTILE_SITE_KEY && !captcha?.token)) return;
  const captchaToken = captcha?.token;
  loginEmCurso = true;
  atualizarLogin();
  status.textContent = 'Entrando…';
  try {
    conferir(await cliente.auth.signInWithPassword({
      email: login.elements.email.value.trim(), password: login.elements.senha.value,
      options: { captchaToken }
    }));
    login.reset();
    await conferirSessao();
  } catch (error) {
    status.textContent = erroAmigavel(error);
  } finally {
    loginEmCurso = false;
    captcha?.reset();
    atualizarLogin();
  }
});
el('gestor-sair').addEventListener('click', async () => {
  try {
    conferir(await cliente.auth.signOut({ scope: 'local' }));
    location.reload();
  } catch (error) { status.textContent = erroAmigavel(error); }
});

function renderLista() {
  lista.replaceChildren();
  for (const row of listaAtual) {
    const li = document.createElement('li');
    const botao = document.createElement('button');
    const info = document.createElement('p');
    botao.type = 'button';
    botao.className = 'text-button';
    botao.textContent = nomeCategoria(row.categoria) + ' · ' + row.protocolo;
    botao.addEventListener('click', () => abrir(row.id));
    info.textContent = [etapas[row.etapa], row.referencia, dataLocal(row.criado_em)].join(' · ');
    li.append(botao, info);
    lista.append(li);
  }
  const total = Object.keys(etapas).map(id => etapas[id] + ': ' + listaAtual.filter(item => item.etapa === id).length);
  el('gestor-contagens').textContent = total.join(' · ');
}

function renderMapa() {
  if (mapaEl.hidden) return;
  if (!mapa) {
    mapa = criarMapa(mapaEl);
    pontos = window.L.layerGroup().addTo(mapa);
  }
  mapa.invalidateSize();
  pontos.clearLayers();
  for (const row of listaAtual) {
    const titulo = nomeCategoria(row.categoria) + ' · ' + etapas[row.etapa];
    const botao = document.createElement('button');
    botao.className = 'text-button';
    botao.type = 'button';
    botao.textContent = 'Abrir ' + row.protocolo;
    botao.addEventListener('click', () => abrir(row.id));
    window.L.marker([row.lat, row.lng], { title: titulo, alt: titulo }).addTo(pontos).bindPopup(botao);
  }
}
async function carregar(automatico = false) {
  if (painel.hidden || (automatico && (document.hidden || consultaEmCurso))) return;
  const vez = ++pedido;
  consultaEmCurso = vez;
  if (!automatico) status.textContent = 'Carregando ocorrências…';
  try {
    const rows = await gestorListar(filtros.elements.periodo.value, filtros.elements.categoria.value || null);
    if (vez !== pedido) return;
    const assinatura = JSON.stringify(rows);
    if (assinatura !== ultimaLista) {
      const protocoloEmFoco = lista.contains(document.activeElement) ? document.activeElement.textContent : null;
      listaAtual = rows;
      renderLista();
      renderMapa();
      ultimaLista = assinatura;
      if (protocoloEmFoco) [...lista.querySelectorAll('button')]
        .find(button => button.textContent === protocoloEmFoco)?.focus({ preventScroll: true });
    }
    status.textContent = rows.length ? '' : 'Nenhuma ocorrência para estes filtros.';
  } catch (error) {
    if (vez === pedido) status.textContent = erroAmigavel(error);
  } finally {
    if (consultaEmCurso === vez) consultaEmCurso = 0;
  }
}
filtros.addEventListener('change', () => carregar());
setInterval(() => carregar(true), 15_000);
document.addEventListener('visibilitychange', () => carregar(true));
window.addEventListener('online', () => carregar(true));
filtros.addEventListener('submit', event => event.preventDefault());
function alternar(verMapa) {
  lista.hidden = verMapa;
  mapaEl.hidden = !verMapa;
  for (const [id, ativo] of [['gestor-ver-lista', !verMapa], ['gestor-ver-mapa', verMapa]]) {
    el(id).classList.toggle('active', ativo);
    el(id).setAttribute('aria-pressed', String(ativo));
  }
  try { renderMapa(); } catch (error) { status.textContent = error.message; }
}
el('gestor-ver-lista').addEventListener('click', () => alternar(false));
el('gestor-ver-mapa').addEventListener('click', () => alternar(true));

async function abrir(id, confirmado) {
  const vez = ++pedidoDetalhe;
  pedido++;
  status.textContent = 'Carregando detalhes…';
  try {
    const row = await gestorDetalhe(id);
    if (vez !== pedidoDetalhe) return;
    if (!row) throw new Error('RELATO_INEXISTENTE');
    selecionado = row;
    painel.hidden = true;
    detalhe.hidden = false;
    el('detalhe-titulo').textContent = row.protocolo + ' · ' + etapas[row.etapa];
    el('detalhe-titulo').focus();
    const dl = el('detalhe-dados');
    dl.replaceChildren();
    for (const [chave, valor] of Object.entries({
      Categoria: nomeCategoria(row.categoria), Descrição: row.descricao, Referência: row.referencia,
      Contato: row.contato, Coordenadas: row.lat + ', ' + row.lng, Recebido: dataLocal(row.criado_em)
    })) {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = chave;
      dd.textContent = valor;
      dl.append(dt, dd);
    }
    try {
      if (!local) local = criarMapa(el('detalhe-mapa'), { zoomControl: false });
      const ponto = [row.lat, row.lng];
      local.invalidateSize();
      local.setView(ponto, 16);
      if (localPino) localPino.setLatLng(ponto);
      else localPino = window.L.marker(ponto).addTo(local);
    } catch { el('detalhe-mapa').textContent = 'Mapa indisponível.'; }
    const historico = el('detalhe-historico');
    historico.replaceChildren();
    for (const item of row.historico) {
      const li = document.createElement('li');
      li.textContent = [etapas[item.para], dataLocal(item.criado_em), item.observacao].filter(Boolean).join(' · ');
      historico.append(li);
    }
    etapaForm.reset();
    etapaForm.elements.etapa.replaceChildren();
    for (const id of transicoes[row.etapa]) etapaForm.elements.etapa.add(new Option(etapas[id], id));
    etapaForm.hidden = transicoes[row.etapa].length === 0;
    const foto = el('detalhe-foto');
    foto.hidden = true;
    foto.removeAttribute('src');
    const avisoFoto = el('detalhe-foto-status');
    avisoFoto.textContent = '';
    status.textContent = confirmado ? 'Etapa alterada para ' + etapas[row.etapa] + '.' : '';
    if (row.foto_path) {
      try {
        const url = await urlDaFoto(row.foto_path);
        if (vez === pedidoDetalhe) { foto.src = url; foto.hidden = false; }
      } catch {
        if (vez === pedidoDetalhe) avisoFoto.textContent = 'Não foi possível abrir a foto privada.';
      }
    }
  } catch (error) {
    if (vez === pedidoDetalhe) status.textContent = erroAmigavel(error);
  }
}
el('gestor-voltar').addEventListener('click', () => {
  pedidoDetalhe++;
  mostrarPainel();
  alternar(false);
  carregar();
});
etapaForm.addEventListener('submit', async event => {
  event.preventDefault();
  const botao = etapaForm.querySelector('button');
  const id = selecionado?.id;
  const nova_etapa = etapaForm.elements.etapa.value;
  if (!id || botao.disabled || !nova_etapa) return;
  if (nova_etapa === 'rejeitada' && !window.confirm('Rejeitar este relato? Ele não será publicado.')) return;
  botao.disabled = true;
  el('gestor-voltar').disabled = true;
  status.textContent = 'Salvando etapa…';
  try {
    await alterarEtapa({ id, nova_etapa, observacao: etapaForm.elements.observacao.value || null });
    await abrir(id, true);
  } catch (error) {
    status.textContent = erroAmigavel(error);
  } finally {
    botao.disabled = false;
    el('gestor-voltar').disabled = false;
  }
});
conferirSessao().catch(error => { status.textContent = erroAmigavel(error); });
