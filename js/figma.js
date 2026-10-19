// Navegação demonstrativa das telas do Figma. Não persiste nem transmite dados.
const dialog = document.querySelector('#aviso-dialog');
function avisar(texto) {
  document.querySelector('#aviso-texto').textContent = texto;
  dialog.showModal();
}
document.querySelectorAll('[data-conta]').forEach((botao) => {
  botao.addEventListener('click', () => avisar('As telas de entrada e cadastro ainda não estão implementadas. Nenhuma conta será criada.'));
});
document.querySelector('[data-local-demo]')?.addEventListener('click', () => {
  avisar('Este mapa é ilustrativo. A localização por GPS e a marcação do pino ainda não estão integradas. Preencha o endereço para experimentar o fluxo.');
});
const formulario = document.querySelector('#relato-etapas');
if (formulario) {
  const etapas = [...document.querySelectorAll('[data-step]')];
  let atual = 1;
  function mostrar(numero) {
    atual = numero;
    etapas.forEach((etapa) => { etapa.hidden = Number(etapa.dataset.step) !== atual; });
    const valores = new FormData(formulario);
    document.querySelectorAll('[data-review]').forEach((campo) => {
      campo.textContent = valores.get(campo.dataset.review) || 'Não informado';
    });
    document.querySelector('#review-photo').textContent = document.querySelector('#foto').files.length ? 'Foto anexada' : 'Sem foto anexada';
    document.querySelector(`[data-step="${atual}"] h1`).focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  document.querySelectorAll('[data-next]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const campos = etapas[atual - 1].querySelectorAll('input, textarea');
      for (const campo of campos) { if (!campo.reportValidity()) return; }
      mostrar(Math.min(atual + 1, 4));
    });
  });
  document.querySelectorAll('[data-back]').forEach((botao) => botao.addEventListener('click', () => mostrar(Math.max(1, atual - 1))));
  document.querySelectorAll('[data-edit]').forEach((botao) => botao.addEventListener('click', () => mostrar(Number(botao.dataset.edit))));
  document.querySelector('#foto').addEventListener('change', (event) => {
    document.querySelector('#foto-nome').textContent = event.target.files[0]?.name || 'Adicionar uma foto';
  });
  formulario.addEventListener('submit', (event) => event.preventDefault());
  document.querySelector('#enviar-demo').addEventListener('click', () => avisar('Esta demonstração termina na revisão. Nenhum relato foi enviado, nenhum dado foi salvo e nenhum protocolo real foi gerado.'));
}
const consulta = document.querySelector('#consulta-protocolo');
if (consulta) {
  consulta.addEventListener('submit', (event) => {
    event.preventDefault();
    const codigo = document.querySelector('#protocolo').value.trim().toUpperCase();
    const encontrado = codigo === 'MAP-2026-00428';
    document.querySelector('#resultado').hidden = !encontrado;
    document.querySelector('#nao-encontrado').hidden = encontrado;
  });
}
