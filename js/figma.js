// Comportamentos compartilhados das telas ainda demonstrativas.
const dialog = document.querySelector('#aviso-dialog');
function avisar(texto) {
  document.querySelector('#aviso-texto').textContent = texto;
  dialog.showModal();
}

document.querySelectorAll('[data-conta]').forEach((botao) => {
  botao.addEventListener('click', () => avisar('Entrada e cadastro ainda não estão implementados. Nenhuma conta será criada.'));
});

document.querySelector('[data-local-demo]')?.addEventListener('click', () => {
  avisar('GPS e marcação do pino ainda não estão integrados. Informe um endereço fictício para experimentar o fluxo local.');
});
