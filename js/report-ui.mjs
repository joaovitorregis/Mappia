import { recebimentoRealDisponivel, verificarContato, criarRelato, subirFoto } from './supabase.mjs?v=10';
import { SUPABASE_URL, TURNSTILE_SITE_KEY } from './config.js?v=10';
import { montarTurnstile } from './turnstile.mjs';
import { telefoneBrasileiro } from './telefone.mjs';
import { criarMapa, localizar, temCartografia } from './mapa-base.mjs?v=10';
import { prepararFoto } from './foto.mjs';
import { nomeCategoria } from './categorias.mjs';
import { erroAmigavel } from './erros.mjs?v=10';
import { guardarProtocolo, linkProtocolo } from './protocolos.mjs?v=10';

const form = document.querySelector('#relato-etapas');
const el = id => document.getElementById(id);
const steps = [...form.querySelectorAll('[data-step]')];
const contato = el('contact-feedback');
const feedback = el('submit-feedback');
let step = 1;
let mapa, pino, mapaRevisao, pinoRevisao, ponto;
let verificacao, prova, foto, fotoUrl, envio;
let widget, carregandoWidget, fotoAutorizada;
let solicitandoCodigo = false;
let versaoContato = 0;
let versaoFoto = 0;
let pedidoGps = 0;
let preparandoFoto = false;
let enviando = false;
const chaveRascunho = 'mappia:' + SUPABASE_URL + ':real:rascunho';

function salvarRascunho() {
  const data = new FormData(form);
  try {
    sessionStorage.setItem(chaveRascunho, JSON.stringify({
      tipo: data.get('tipo'), descricao: data.get('descricao'), endereco: data.get('endereco'),
      ponto, etapa: Math.min(step, ponto ? 3 : 2), tinhaFoto: Boolean(foto)
    }));
  } catch {
    // O formulário continua disponível sem armazenamento local.
  }
}

function marcar(posicao) {
  ponto = { lat: posicao.lat, lng: posicao.lng };
  salvarRascunho();
  if (pino) return pino.setLatLng(ponto);
  pino = window.L.marker(ponto, { draggable: true, alt: 'Local do relato' }).addTo(mapa);
  pino.on('dragend', () => {
    pedidoGps++;
    marcar(pino.getLatLng());
    el('location-feedback').textContent = 'Ponto marcado.';
  });
}

function abrirMapa() {
  try {
    if (!mapa) {
      mapa = criarMapa(el('mapa-relato'));
      mapa.on('click', evento => {
        if (!podeMarcarNoMapa()) return;
        pedidoGps++;
        marcar(evento.latlng);
        el('location-feedback').textContent = 'Ponto marcado.';
      });
      if (ponto) {
        mapa.setView(ponto, 16);
        marcar(ponto);
      }
    }
    mapa.invalidateSize();
  } catch {
    el('location-feedback').textContent = 'O mapa está indisponível. Recarregue a página.';
  }
}

function podeMarcarNoMapa() {
  if (temCartografia(mapa)) return true;
  el('location-feedback').textContent = 'Aguarde o fundo do mapa ou clique em Usar minha localização.';
  return false;
}

el('gps-relato').addEventListener('click', () => {
  if (!mapa) return;
  const pedido = ++pedidoGps;
  localizar(mapa, el('location-feedback'), marcar, () => pedido === pedidoGps);
});
el('marcar-centro').addEventListener('click', () => {
  if (!mapa || !podeMarcarNoMapa()) return;
  pedidoGps++;
  marcar(mapa.getCenter());
  el('location-feedback').textContent = 'Centro do mapa marcado.';
});

function review() {
  const data = new FormData(form);
  for (const item of form.querySelectorAll('[data-review]')) {
    const campo = item.dataset.review;
    item.textContent = campo === 'tipo' ? nomeCategoria(data.get(campo)) : data.get(campo);
  }
  el('review-contact').textContent = data.get(data.get('contact-channel') === 'email' ? 'email' : 'phone');
  el('review-photo').textContent = foto ? 'Foto incluída' : 'Sem foto';
  el('review-image').hidden = !foto;
  if (foto) el('review-image').src = fotoUrl;
  if (!mapaRevisao) mapaRevisao = criarMapa(el('review-map'), { dragging: false, zoomControl: false, keyboard: false });
  mapaRevisao.invalidateSize();
  mapaRevisao.setView(ponto, 16);
  if (pinoRevisao) pinoRevisao.setLatLng(ponto);
  else pinoRevisao = window.L.marker(ponto).addTo(mapaRevisao);
}

function show(next) {
  if (enviando) return;
  if (step === 2 && next !== 2) pedidoGps++;
  step = next;
  steps.forEach((box, index) => { box.hidden = index !== step - 1; });
  if (step === 2) abrirMapa();
  if (step === 3) prepararSeguranca();
  if (step === 4) review();
  steps[step - 1].querySelector('h1').focus();
  window.scrollTo(0, 0);
  salvarRascunho();
}

function invalidarContato() {
  versaoContato++;
  prova = undefined;
  verificacao = undefined;
  el('verification-panel').hidden = true;
  contato.textContent = '';
}

function habilitarEnvioCodigo(pronto = Boolean(widget?.token)) {
  el('request-code').disabled = !pronto || solicitandoCodigo;
}

function prepararSeguranca() {
  if (carregandoWidget) return;
  const status = el('contato-seguranca-status');
  status.textContent = 'Carregando verificação de segurança…';
  carregandoWidget = montarTurnstile(el('contato-seguranca'), 'contato-envio', pronto => {
    habilitarEnvioCodigo(pronto);
    if (pronto) status.textContent = '';
  }, () => {
    status.textContent = 'A verificação de segurança falhou. Tente novamente no formulário.';
  }).then(resultado => {
    widget = resultado;
    habilitarEnvioCodigo();
  }).catch(() => {
    status.textContent = 'Não foi possível carregar a verificação de segurança. Atualize a página para tentar novamente.';
  });
}

function estadoCanal() {
  const email = new FormData(form).get('contact-channel') === 'email';
  el('email-field').hidden = !email;
  el('phone-field').hidden = email;
  el('email').disabled = !email;
  el('phone').disabled = email;
  invalidarContato();
}

form.querySelectorAll('[name="contact-channel"]').forEach(radio => radio.addEventListener('change', estadoCanal));
for (const id of ['email', 'phone']) el(id).addEventListener('input', invalidarContato);
estadoCanal();

el('request-code').addEventListener('click', async () => {
  if (solicitandoCodigo || !widget?.token) return;
  const data = new FormData(form);
  const canal = data.get('contact-channel') === 'email' ? 'email' : 'telefone';
  const input = el(canal === 'email' ? 'email' : 'phone');
  if (!input.reportValidity()) return;
  const valor = canal === 'telefone' ? telefoneBrasileiro(input.value) : input.value.trim();
  if (!valor) {
    contato.textContent = 'Informe um celular brasileiro com DDD.';
    return;
  }
  const captcha = widget.token;
  invalidarContato();
  const versao = versaoContato;
  solicitandoCodigo = true;
  habilitarEnvioCodigo();
  contato.textContent = 'Enviando o código…';
  try {
    const result = await verificarContato({ acao: 'enviar', canal, contato: valor, captcha });
    if (versao !== versaoContato) return;
    if (!result?.verificacao_id) throw new Error('VERIFICACAO_INDISPONIVEL');
    verificacao = result.verificacao_id;
    el('verification-code').value = '';
    el('verification-panel').hidden = false;
    contato.textContent = canal === 'email'
      ? 'Confira a caixa de entrada e a pasta de spam do seu e-mail.'
      : 'Confira o SMS enviado para o celular.';
    el('verification-code').focus();
  } catch (error) {
    if (versao === versaoContato) contato.textContent = erroAmigavel(error);
  } finally {
    solicitandoCodigo = false;
    widget.reset();
    habilitarEnvioCodigo();
  }
});

el('verify-code').addEventListener('click', async event => {
  if (!verificacao) return;
  const button = event.currentTarget;
  const versao = versaoContato;
  const codigo = el('verification-code').value.trim();
  if (!/^\d{6}$/.test(codigo)) {
    contato.textContent = 'Digite os seis dígitos que você recebeu.';
    return;
  }
  button.disabled = true;
  try {
    const result = await verificarContato({ acao: 'confirmar', verificacao_id: verificacao, codigo });
    if (versao !== versaoContato) return;
    if (!result?.prova) throw new Error('VERIFICACAO_INDISPONIVEL');
    prova = result.prova;
    contato.textContent = 'Código confirmado. Você pode continuar.';
    el('verification-panel').hidden = true;
  } catch (error) {
    if (versao === versaoContato) contato.textContent = erroAmigavel(error);
  } finally {
    button.disabled = false;
  }
});

function removerFoto() {
  versaoFoto++;
  preparandoFoto = false;
  if (fotoUrl) URL.revokeObjectURL(fotoUrl);
  fotoUrl = undefined;
  foto = undefined;
  el('foto').value = '';
  el('foto-preview').hidden = true;
  el('foto-preview').removeAttribute('src');
  el('remove-photo').hidden = true;
  el('foto-nome').textContent = 'Adicionar uma foto';
  salvarRascunho();
}

el('foto').addEventListener('change', async event => {
  const arquivo = event.target.files[0];
  if (!arquivo) return;
  removerFoto();
  const versao = versaoFoto;
  preparandoFoto = true;
  try {
    const jpeg = await prepararFoto(arquivo);
    if (versao !== versaoFoto) return;
    foto = jpeg;
    fotoUrl = URL.createObjectURL(jpeg);
    el('foto-preview').src = fotoUrl;
    el('foto-preview').hidden = false;
    el('remove-photo').hidden = false;
    el('foto-nome').textContent = 'Foto selecionada';
    el('location-feedback').textContent = 'Foto pronta para envio.';
    salvarRascunho();
  } catch (error) {
    if (versao === versaoFoto) el('location-feedback').textContent = 'Não foi possível preparar a imagem. Selecione outra foto.';
  } finally {
    if (versao === versaoFoto) preparandoFoto = false;
  }
});
el('remove-photo').addEventListener('click', removerFoto);

form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('input', event => {
  if (['tipo', 'descricao', 'endereco'].includes(event.target.name)) salvarRascunho();
});
for (const botao of form.querySelectorAll('[data-next]')) {
  botao.addEventListener('click', () => {
    const atual = steps[step - 1];
    if ([...atual.querySelectorAll('input, textarea')].some(campo => !campo.reportValidity())) return;
    if (step === 2 && (!ponto || preparandoFoto)) {
      el('location-feedback').textContent = preparandoFoto ? 'Aguarde a preparação da foto.' : 'Marque o local no mapa.';
      return;
    }
    if (step === 3 && !prova) {
      contato.textContent = 'Confirme o código para continuar.';
      return;
    }
    show(step + 1);
  });
}
form.querySelectorAll('[data-back]').forEach(botao => botao.addEventListener('click', () => show(step - 1)));
form.querySelectorAll('[data-edit]').forEach(botao => botao.addEventListener('click', () => show(Number(botao.dataset.edit))));

el('enviar-relato').addEventListener('click', async event => {
  if (enviando || !prova || !ponto) return;
  const button = event.currentTarget;
  const data = new FormData(form);
  const campos = {
    prova, categoria: data.get('tipo'), descricao: data.get('descricao'),
    referencia: data.get('endereco'), lat: ponto.lat, lng: ponto.lng
  };
  const assinatura = JSON.stringify(campos);
  if (envio?.assinatura !== assinatura || envio.foto !== foto) {
    envio = { assinatura, foto, id: crypto.randomUUID() };
  }
  if (foto && fotoAutorizada?.prova === prova && fotoAutorizada.arquivo !== foto) {
    invalidarContato();
    show(3);
    contato.textContent = 'Confirme um novo código para enviar a foto que você escolheu.';
    return;
  }
  enviando = true;
  button.disabled = true;
  feedback.textContent = 'Enviando relato…';
  let verificarDeNovo = false;
  try {
    if (foto && fotoAutorizada?.prova !== prova) {
      fotoAutorizada = { prova, arquivo: foto, acesso: null, enviada: false };
    }
    if (foto && !fotoAutorizada.acesso) {
      const acesso = await verificarContato({ acao: 'foto', prova });
      if (!acesso?.path || !acesso?.token) throw new Error('FOTO_INVALIDA');
      fotoAutorizada.acesso = acesso;
    }
    if (foto && !fotoAutorizada.enviada) {
      try {
        await subirFoto(fotoAutorizada.acesso, foto);
      } catch (error) {
        const duplicado = error.error === 'Duplicate' || error.code === 'ResourceAlreadyExists' ||
          String(error.statusCode ?? error.status) === '409';
        if (!duplicado) {
          fotoAutorizada.acesso = null;
          throw error;
        }
      }
      fotoAutorizada.enviada = true;
    }
    const relato = await criarRelato({ ...campos, foto_path: foto ? fotoAutorizada.acesso.path : null, chave_idempotencia: envio.id });
    try { guardarProtocolo(relato); } catch { el('confirmation-note').textContent = 'Copie o protocolo. O navegador bloqueou o armazenamento neste aparelho.'; }
    try { sessionStorage.removeItem(chaveRascunho); } catch { /* protocolo já gerado */ }
    form.hidden = true;
    el('confirmation-protocol').textContent = relato.protocolo;
    el('confirmation-link').href = linkProtocolo(relato.protocolo);
    el('confirmation').hidden = false;
    el('confirmation').querySelector('h2').focus();
  } catch (error) {
    feedback.textContent = erroAmigavel(error);
    verificarDeNovo = error.message === 'CONTATO_NAO_VERIFICADO';
  } finally {
    enviando = false;
    button.disabled = false;
    if (verificarDeNovo) {
      invalidarContato();
      show(3);
      contato.textContent = 'Confirme um novo código antes de enviar o relato.';
    }
  }
});

el('copiar-protocolo').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(el('confirmation-protocol').textContent);
    el('confirmation-note').textContent = 'Protocolo copiado.';
  } catch {
    el('confirmation-note').textContent = 'Selecione o protocolo acima para copiá-lo.';
  }
});

function restaurarRascunho() {
  const rascunho = JSON.parse(sessionStorage.getItem(chaveRascunho));
  if (rascunho) {
    const tipo = [...form.elements.tipo].find(item => item.value === rascunho.tipo);
    if (tipo) tipo.checked = true;
    el('descricao').value = rascunho.descricao ?? '';
    el('endereco').value = rascunho.endereco ?? '';
    if (Number.isFinite(rascunho.ponto?.lat) && Number.isFinite(rascunho.ponto?.lng)) ponto = rascunho.ponto;
    const etapa = rascunho.tinhaFoto ? 2 : Math.min(rascunho.etapa, ponto ? 3 : 2);
    if (etapa > 1) show(etapa);
    if (rascunho.tinhaFoto) el('location-feedback').textContent = 'Rascunho recuperado. Selecione a foto novamente.';
  }
}

async function abrirRecebimento() {
  if (!TURNSTILE_SITE_KEY) return;
  const status = el('recebimento-status');
  status.textContent = 'Verificando se o envio de relatos está disponível…';
  try {
    if (await recebimentoRealDisponivel() !== true) throw new Error('VERIFICACAO_INDISPONIVEL');
    el('recebimento-aviso').hidden = true;
    form.hidden = false;
    try { restaurarRascunho(); } catch { /* O envio fica disponível sem rascunho local. */ }
  } catch {
    status.textContent = 'O envio de relatos está indisponível no momento.';
  }
}
abrirRecebimento();
