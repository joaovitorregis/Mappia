import { MODO_APRESENTACAO } from './config.js';
const faixa = document.querySelector('[data-apresentacao]');
if (faixa) faixa.hidden = !MODO_APRESENTACAO;
const botoes = document.querySelectorAll('[data-conta]');
if (botoes.length) {
  import('./supabase.mjs').then(async ({ cliente }) => {
    const atualizar = sessao => botoes.forEach(botao => {
      botao.textContent = sessao ? 'Meus relatos' : (botao.dataset.conta || 'Entrar');
      botao.href = new URL(sessao ? '../meus-relatos.html' : '../conta.html', import.meta.url).href;
    });
    atualizar((await cliente.auth.getSession()).data.session);
    cliente.auth.onAuthStateChange((_, sessao) => atualizar(sessao));
  }).catch(() => {});
}
