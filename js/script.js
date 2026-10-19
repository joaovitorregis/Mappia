// Interações locais de apresentação. Ainda não há serviço de envio ou consulta real.
const formRelato = document.querySelector('#form-relato');
if (formRelato) {
  formRelato.addEventListener('submit', (event) => {
    event.preventDefault();
    const mensagem = document.querySelector('#mensagem-form');
    mensagem.textContent = 'Os campos estão preenchidos. Esta é uma demonstração: nenhum relato foi enviado ou salvo e nenhum protocolo foi gerado.';
    mensagem.hidden = false;
    mensagem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

const formBusca = document.querySelector('#form-busca');
if (formBusca) {
  const filtros = document.querySelectorAll('.filtros [data-status]');
  const relatos = document.querySelectorAll('.relato');
  const campoBusca = document.querySelector('#protocolo');
  let status = 'todos';
  function filtrarRelatos() {
    const protocolo = campoBusca.value.trim().replace(/^#/, '').toLowerCase();
    let encontrados = 0;
    relatos.forEach((relato) => {
      const codigo = relato.querySelector('.relato-meta span').textContent.replace('#', '').toLowerCase();
      const visivel = (status === 'todos' || relato.dataset.status === status) && (!protocolo || codigo === protocolo);
      relato.hidden = !visivel;
      if (visivel) encontrados++;
    });
    document.querySelector('#msg-vazio').hidden = encontrados > 0;
  }
  filtros.forEach((botao) => {
    botao.setAttribute('aria-pressed', String(botao.classList.contains('active')));
    botao.addEventListener('click', () => {
      status = botao.dataset.status;
      filtros.forEach((item) => {
        item.classList.toggle('active', item === botao);
        item.setAttribute('aria-pressed', String(item === botao));
      });
      filtrarRelatos();
    });
  });
  formBusca.addEventListener('submit', (event) => { event.preventDefault(); filtrarRelatos(); });
  campoBusca.addEventListener('input', filtrarRelatos);
  document.querySelector('#msg-vazio').setAttribute('role', 'status');
}
