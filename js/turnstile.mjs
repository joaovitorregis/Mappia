import { TURNSTILE_SITE_KEY } from './config.js?v=10';

let carregamento;
function carregar() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!carregamento) {
    carregamento = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.addEventListener('load', () => {
        if (window.turnstile) resolve(window.turnstile);
        else reject(new Error('Turnstile indisponível'));
      });
      script.addEventListener('error', () => reject(new Error('Turnstile indisponível')));
      document.head.append(script);
    });
  }
  return carregamento;
}

export async function montarTurnstile(elemento, action, mudou, falhou) {
  if (!TURNSTILE_SITE_KEY) throw new Error('Turnstile sem configuração');
  const api = await carregar();
  let token = '';
  const limpar = () => { token = ''; mudou(false); };
  const falha = () => { limpar(); falhou(); };
  const id = api.render(elemento, {
    sitekey: TURNSTILE_SITE_KEY,
    action,
    size: 'flexible',
    'response-field': false,
    callback: valor => { token = valor; mudou(true); },
    'expired-callback': limpar,
    'error-callback': falha,
    'timeout-callback': falha,
    'unsupported-callback': falha
  });
  return {
    get token() { return token; },
    reset() { limpar(); api.reset(id); }
  };
}
