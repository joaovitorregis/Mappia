const actionTurnstile = 'contato-envio';
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const provaValida = /^[0-9a-f]{64}$/;
const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const telefoneBrasil = /^\+55[1-9][0-9][2-9][0-9]{7,8}$/;
const fotoReal = /^real\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.jpg$/;
const limiteBytes = 4096;
const errosBanco = new Map([
  ['LIMITE_GLOBAL', 429],
  ['LIMITE_CODIGOS', 429],
  ['VERIFICACAO_INDISPONIVEL', 503],
  ['CONTATO_INVALIDO', 400],
  ['CODIGO_INVALIDO', 400],
  ['CODIGO_EXPIRADO', 400],
  ['TENTATIVAS_ESGOTADAS', 429],
  ['CONTATO_NAO_VERIFICADO', 403]
]);

class ErroPublico extends Error {
  constructor(codigo, status) {
    super(codigo);
    this.status = status;
  }
}

function indisponivel() {
  return new ErroPublico('VERIFICACAO_INDISPONIVEL', 503);
}

async function lerEntrada(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new ErroPublico('REQUISICAO_INVALIDA', 415);
  }
  if (Number(request.headers.get('content-length')) > limiteBytes) {
    throw new ErroPublico('REQUISICAO_GRANDE', 413);
  }
  if (!request.body) throw new ErroPublico('REQUISICAO_INVALIDA', 400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let texto = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limiteBytes) throw new ErroPublico('REQUISICAO_GRANDE', 413);
      texto += decoder.decode(value, { stream: true });
    }
    const parsed = JSON.parse(texto + decoder.decode());
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch (error) {
    void reader.cancel().catch(() => {});
    if (error instanceof ErroPublico) throw error;
    throw new ErroPublico('REQUISICAO_INVALIDA', 400);
  } finally {
    reader.releaseLock();
  }
}

function origemPermitida(value) {
  try {
    const url = new URL(value);
    const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    return value === url.origin && (url.protocol === 'https:' || (loopback && url.protocol === 'http:'));
  } catch {
    return false;
  }
}

function normalizarContato(canal, contato) {
  if (typeof contato !== 'string' || contato.length > 254) return null;
  if (canal === 'email') {
    const email = contato.trim().toLowerCase();
    return emailValido.test(email) ? email : null;
  }
  if (canal !== 'telefone') return null;
  const numero = contato.trim().replace(/[ ()-]/g, '');
  const canonical = numero.startsWith('+') ? numero : '+55' + numero;
  return telefoneBrasil.test(canonical) ? canonical : null;
}

export function criarHandler(env, fetchApi = fetch) {
  const origens = new Set((env.MAPPIA_ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(origemPermitida));
  const {
    SUPABASE_URL: supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    TURNSTILE_SECRET_KEY: turnstileSecret, TWILIO_API_KEY_SID: twilioKey,
    TWILIO_API_KEY_SECRET: twilioSecret, TWILIO_VERIFY_SERVICE_SID: verifySid
  } = env;
  const banco = supabaseUrl?.replace(/\/+$/, '');
  const baseTwilio = 'https://verify.twilio.com/v2/Services/' + verifySid;
  const estado = env.MAPPIA_CONTACT_STATE;
  const contatosPiloto = new Set((env.MAPPIA_PILOT_CONTACTS ?? '').split(',')
    .map(value => normalizarContato(value.includes('@') ? 'email' : 'telefone', value.trim())).filter(Boolean));
  const ativo = estado === 'public' || (estado === 'pilot' && contatosPiloto.size > 0);
  const pronto = Boolean(banco && serviceKey && turnstileSecret && twilioSecret &&
    /^SK[0-9a-f]{32}$/i.test(twilioKey) && /^VA[0-9a-f]{32}$/i.test(verifySid) && ativo);

  function verificarListaPiloto(contato) {
    if (estado === 'pilot' && !contatosPiloto.has(contato)) throw indisponivel();
  }

  async function postJson(url, body, headers = {}) {
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), 7000);
    try {
      const response = await fetchApi(url, {
        method: 'POST', body, headers, signal: controle.signal, redirect: 'error'
      });
      const data = await response.json().catch(() => null);
      return { status: response.status, ok: response.ok, data };
    } catch {
      throw indisponivel();
    } finally {
      clearTimeout(timer);
    }
  }

  const postBanco = (path, body) => postJson(banco + path, JSON.stringify(body), {
    apikey: serviceKey, authorization: 'Bearer ' + serviceKey, 'content-type': 'application/json'
  });

  async function rpc(nome, body) {
    const { ok, data } = await postBanco('/rest/v1/rpc/' + nome, body);
    const codigo = ok ? data?.erro : data?.message;
    if (errosBanco.has(codigo)) throw new ErroPublico(codigo, errosBanco.get(codigo));
    if (!ok || data === null || data?.erro) throw indisponivel();
    return data;
  }

  async function verificarCaptcha(token, origin) {
    if (typeof token !== 'string' || !token || token.length > 2048) {
      throw new ErroPublico('CAPTCHA_INVALIDO', 400);
    }
    const { ok, data } = await postJson('https://challenges.cloudflare.com/turnstile/v0/siteverify',
      new URLSearchParams({ secret: turnstileSecret, response: token }));
    if (!ok || !data) throw indisponivel();
    if (data.success !== true || data.action !== actionTurnstile || data.hostname !== new URL(origin).hostname) {
      throw new ErroPublico('CAPTCHA_INVALIDO', 400);
    }
  }

  function twilio(path, campos) {
    return postJson(baseTwilio + path, new URLSearchParams(campos), {
      authorization: 'Basic ' + btoa(twilioKey + ':' + twilioSecret)
    });
  }

  async function enviar(entrada, origin) {
    const destino = normalizarContato(entrada.canal, entrada.contato);
    if (!destino) throw new ErroPublico('CONTATO_INVALIDO', 400);
    await verificarCaptcha(entrada.captcha, origin);
    verificarListaPiloto(destino);
    const { verificacao_id, contato } = await rpc('preparar_verificacao_real', {
      canal: entrada.canal, contato: destino
    });
    if (typeof verificacao_id !== 'string' || !uuid.test(verificacao_id) ||
        contato !== destino) throw indisponivel();
    verificarListaPiloto(contato);
    const channel = entrada.canal === 'telefone' ? 'sms' : 'email';
    const resposta = await twilio('/Verifications', { To: contato, Channel: channel });
    if (resposta.status === 429) throw new ErroPublico('LIMITE_CODIGOS', 429);
    if (!resposta.ok || resposta.data?.status !== 'pending' ||
        resposta.data?.to !== contato || resposta.data?.channel !== channel) throw indisponivel();
    return { verificacao_id };
  }

  async function confirmar(entrada) {
    const { verificacao_id, codigo } = entrada;
    if (typeof verificacao_id !== 'string' || !uuid.test(verificacao_id) ||
        typeof codigo !== 'string' || !/^[0-9]{6}$/.test(codigo)) throw new ErroPublico('CODIGO_INVALIDO', 400);
    const { canal, contato } = await rpc('registrar_tentativa_real', { verificacao_id });
    if (typeof contato !== 'string' || normalizarContato(canal, contato) !== contato) throw indisponivel();
    verificarListaPiloto(contato);
    const channel = canal === 'telefone' ? 'sms' : 'email';
    const resposta = await twilio('/VerificationCheck', { To: contato, Code: codigo });
    if (resposta.status === 404) throw new ErroPublico('CODIGO_EXPIRADO', 400);
    if (resposta.status === 429 || resposta.data?.code === 60202) {
      throw new ErroPublico('TENTATIVAS_ESGOTADAS', 429);
    }
    if (!resposta.ok) throw indisponivel();
    if (resposta.data?.status !== 'approved' || resposta.data?.to !== contato || resposta.data?.channel !== channel) {
      throw new ErroPublico('CODIGO_INVALIDO', 400);
    }
    const prova = await rpc('emitir_prova_real', { verificacao_id });
    if (typeof prova !== 'string' || !provaValida.test(prova)) throw indisponivel();
    return { prova };
  }

  async function autorizarFoto(entrada) {
    if (typeof entrada.prova !== 'string' || !provaValida.test(entrada.prova)) {
      throw new ErroPublico('CONTATO_NAO_VERIFICADO', 403);
    }
    const path = await rpc('autorizar_foto_real', { prova: entrada.prova });
    if (typeof path !== 'string' || !fotoReal.test(path)) throw indisponivel();
    const { ok, data } = await postBanco('/storage/v1/object/upload/sign/fotos/' + path, {});
    if (!ok || typeof data?.url !== 'string') throw indisponivel();
    const token = new URL(data.url, banco).searchParams.get('token');
    if (!token) throw indisponivel();
    return { path, token };
  }

  return async request => {
    const origin = request.headers.get('origin');
    const headers = { 'cache-control': 'no-store', vary: 'Origin' };
    if (!origens.has(origin)) {
      return Response.json({ erro: 'ORIGEM_INVALIDA' }, { status: 403, headers });
    }
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-methods'] = 'POST, OPTIONS';
    headers['access-control-allow-headers'] = 'apikey, authorization, content-type, x-client-info, x-region';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') {
      return Response.json({ erro: 'METODO_INVALIDO' }, { status: 405, headers: { ...headers, Allow: 'POST, OPTIONS' } });
    }
    try {
      if (!pronto) throw indisponivel();
      const entrada = await lerEntrada(request);
      let resultado;
      if (entrada.acao === 'enviar') resultado = await enviar(entrada, origin);
      else if (entrada.acao === 'confirmar') resultado = await confirmar(entrada);
      else if (entrada.acao === 'foto') resultado = await autorizarFoto(entrada);
      else throw new ErroPublico('REQUISICAO_INVALIDA', 400);
      return Response.json(resultado, { headers });
    } catch (error) {
      const seguro = error instanceof ErroPublico ? error : indisponivel();
      return Response.json({ erro: seguro.message }, { status: seguro.status, headers });
    }
  };
}
