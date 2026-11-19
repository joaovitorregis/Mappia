import { cliente, conferir } from './supabase.mjs';
import { erroAmigavel } from './erros.mjs';

const form = document.querySelector('#form-conta');
const status = document.querySelector('#conta-status');
const enviar = document.querySelector('#conta-enviar');
const entrar = document.querySelector('#modo-entrar');
const cadastro = document.querySelector('#modo-cadastro');
let criando = false;

function modo(valor) {
  criando = valor;
  entrar.classList.toggle('active', !valor);
  cadastro.classList.toggle('active', valor);
  entrar.setAttribute('aria-pressed', String(!valor));
  cadastro.setAttribute('aria-pressed', String(valor));
  enviar.textContent = valor ? 'Criar conta' : 'Entrar';
  form.elements.senha.autocomplete = valor ? 'new-password' : 'current-password';
  status.textContent = '';
}
entrar.addEventListener('click', () => modo(false));
cadastro.addEventListener('click', () => modo(true));
modo(new URLSearchParams(location.search).get('modo') === 'cadastro');
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (enviar.disabled) return;
  const auth = { email: form.elements.email.value.trim(), password: form.elements.senha.value };
  enviar.disabled = true;
  entrar.disabled = cadastro.disabled = true;
  status.textContent = 'Aguarde…';
  try {
    const dados = conferir(criando ? await cliente.auth.signUp(auth) : await cliente.auth.signInWithPassword(auth));
    if (dados.session) location.assign('meus-relatos.html');
    else status.textContent = 'Confirme o e-mail para entrar.';
  } catch (error) {
    status.textContent = erroAmigavel(error);
  } finally {
    enviar.disabled = false;
    entrar.disabled = cadastro.disabled = false;
  }
});
