import { cliente, conferir, recebimentoRealDisponivel } from './supabase.mjs?v=10';
import { CONTAS_ATIVAS, TELEFONE_ATIVO, TURNSTILE_SITE_KEY } from './config.js?v=10';
import { erroAmigavel } from './erros.mjs?v=10';
import { telefoneBrasileiro } from './telefone.mjs';
import { montarTurnstile } from './turnstile.mjs';

const el = id => document.getElementById(id);
const form = el('form-conta');
const sms = el('form-sms');
const confirmarSms = el('form-sms-confirmar');
const status = el('conta-status');
const segurancaStatus = el('conta-seguranca-status');
const entrar = el('modo-entrar');
const cadastro = el('modo-cadastro');
const canalEmail = el('canal-email');
const canalSms = el('canal-sms');
const enviar = el('conta-enviar');
const botoes = [enviar, el('sms-enviar'), el('sms-confirmar')];
let criando = false;
let viaSms = false;
let codigoEnviadoPara;
let captcha;
let ocupado = false;

function atualizarBotoes(pronto = Boolean(captcha?.token)) {
  for (const botao of botoes) botao.disabled = ocupado || !pronto;
  for (const botao of [entrar, cadastro, canalEmail, canalSms]) botao.disabled = ocupado;
}

function mostrarCanal() {
  form.hidden = viaSms;
  sms.hidden = !viaSms;
  confirmarSms.hidden = !viaSms || !codigoEnviadoPara;
  for (const [botao, selecionado] of [[canalEmail, !viaSms], [canalSms, viaSms]]) {
    botao.classList.toggle('active', selecionado);
    botao.setAttribute('aria-pressed', String(selecionado));
  }
}
function modo(valor) {
  criando = valor;
  codigoEnviadoPara = undefined;
  entrar.classList.toggle('active', !valor);
  cadastro.classList.toggle('active', valor);
  entrar.setAttribute('aria-pressed', String(!valor));
  cadastro.setAttribute('aria-pressed', String(valor));
  enviar.textContent = valor ? 'Criar conta' : 'Entrar';
  form.elements.senha.autocomplete = valor ? 'new-password' : 'current-password';
  status.textContent = '';
  mostrarCanal();
}
entrar.addEventListener('click', () => modo(false));
cadastro.addEventListener('click', () => modo(true));
canalEmail.addEventListener('click', () => { viaSms = false; modo(criando); });
canalSms.addEventListener('click', () => { viaSms = true; modo(criando); });
sms.elements.celular.addEventListener('input', () => {
  codigoEnviadoPara = undefined;
  mostrarCanal();
});

function proteger(formulario, executar) {
  formulario.addEventListener('submit', async event => {
    event.preventDefault();
    if (ocupado || !captcha?.token) return;
    const captchaToken = captcha.token;
    ocupado = true;
    atualizarBotoes();
    status.textContent = 'Aguarde…';
    try {
      await executar(captchaToken);
    } catch (error) {
      status.textContent = erroAmigavel(error);
    } finally {
      ocupado = false;
      captcha.reset();
      atualizarBotoes();
    }
  });
}

proteger(form, async captchaToken => {
  const credenciais = { email: form.elements.email.value.trim(), password: form.elements.senha.value };
  if (criando) {
    const emailRedirectTo = new URL('meus-relatos.html', location.href).href;
    const dados = conferir(await cliente.auth.signUp({ ...credenciais, options: { emailRedirectTo, captchaToken } }));
    if (dados.session) {
      await cliente.auth.signOut({ scope: 'local' });
      throw new Error('VERIFICACAO_INDISPONIVEL');
    }
    form.elements.senha.value = '';
    status.textContent = 'Abra o link de confirmação enviado para o seu e-mail. Confira também a pasta de spam.';
    return;
  }
  const dados = conferir(await cliente.auth.signInWithPassword({ ...credenciais, options: { captchaToken } }));
  if (!dados.session) throw new Error('VERIFICACAO_INDISPONIVEL');
  location.assign('meus-relatos.html');
});

proteger(sms, async captchaToken => {
  const phone = telefoneBrasileiro(sms.elements.celular.value);
  if (!phone) { status.textContent = 'Informe um celular brasileiro com DDD.'; return; }
  conferir(await cliente.auth.signInWithOtp({ phone, options: { channel: 'sms', shouldCreateUser: criando, captchaToken } }));
  codigoEnviadoPara = phone;
  mostrarCanal();
  confirmarSms.elements.codigo.value = '';
  confirmarSms.elements.codigo.focus();
  status.textContent = 'Confira o código enviado por SMS.';
});

proteger(confirmarSms, async captchaToken => {
  if (!codigoEnviadoPara) return;
  const token = confirmarSms.elements.codigo.value.trim();
  const dados = conferir(await cliente.auth.verifyOtp({
    phone: codigoEnviadoPara, token, type: 'sms', options: { captchaToken }
  }));
  if (!dados.session) throw new Error('VERIFICACAO_INDISPONIVEL');
  location.assign('meus-relatos.html');
});

async function iniciar() {
  if (!CONTAS_ATIVAS || !TURNSTILE_SITE_KEY) return;
  try {
    if (await recebimentoRealDisponivel() !== true) return;
    el('conta-modos').hidden = false;
    el('conta-canais').hidden = !TELEFONE_ATIVO;
    modo(new URLSearchParams(location.search).get('modo') === 'cadastro');
    segurancaStatus.textContent = 'Carregando verificação de segurança…';
    captcha = await montarTurnstile(el('conta-seguranca'), 'conta-acesso', pronto => {
      atualizarBotoes(pronto);
      if (pronto) segurancaStatus.textContent = '';
    }, () => { segurancaStatus.textContent = 'A verificação de segurança falhou. Tente novamente.'; });
    atualizarBotoes();
  } catch {
    segurancaStatus.textContent = 'Não foi possível carregar o acesso à conta. Atualize a página para tentar novamente.';
  }
}
iniciar();
