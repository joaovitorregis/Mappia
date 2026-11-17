import { contactFromForm, reportFromForm } from './report-flow.mjs';

const messages = {
  DEMO_CONTACT_ONLY: 'Use morador@example.com ou o telefone fictício 00000000000.',
  INVALID_CODE: 'Código incorreto. Confira o código exibido nesta página.',
  EXPIRED_CODE: 'O código expirou. Gere outro código de teste.',
  TOO_MANY_ATTEMPTS: 'Tentativas esgotadas. Gere outro código de teste.',
  CONTACT_NOT_VERIFIED: 'Confirme o contato antes de enviar.',
  INVALID_REPORT: 'Revise categoria, descrição e endereço fictício.',
  IDEMPOTENCY_CONFLICT: 'Os dados mudaram após uma tentativa de envio. Recarregue a página.',
  NOT_FOUND: 'Protocolo não encontrado neste servidor local.',
};

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: { 'content-type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('Servidor local indisponível. Inicie com node dev/server.mjs.');
  }
  let body;
  try { body = await response.json(); }
  catch { throw new Error('Resposta inesperada. Execute este fluxo pelo servidor local.'); }
  if (!response.ok) throw new Error(messages[body.error] ?? 'Não foi possível concluir a operação local.');
  return body;
}

const form = document.querySelector('#relato-etapas');
if (form) {
  const steps = [...form.querySelectorAll('[data-step]')];
  const emailField = document.querySelector('#email-field');
  const phoneField = document.querySelector('#phone-field');
  const email = document.querySelector('#email');
  const phone = document.querySelector('#phone');
  const feedback = document.querySelector('#contact-feedback');
  const panel = document.querySelector('#verification-panel');
  const requestCode = document.querySelector('#request-code');
  const verifyCode = document.querySelector('#verify-code');
  let step = 1;
  let challengeId = '';
  let proof = '';
  const idempotencyKey = crypto.randomUUID();

  function channelChanged() {
    const channel = new FormData(form).get('contact-channel');
    emailField.hidden = channel !== 'email';
    phoneField.hidden = channel !== 'phone';
    email.disabled = channel !== 'email';
    phone.disabled = channel !== 'phone';
    challengeId = '';
    proof = '';
    panel.hidden = true;
    feedback.textContent = 'Use apenas contatos fictícios. A verificação local não cria conta.';
  }

  function review() {
    const data = new FormData(form);
    form.querySelectorAll('[data-review]').forEach((item) => {
      item.textContent = data.get(item.dataset.review) || 'Não informado';
    });
    document.querySelector('#review-photo').textContent = document.querySelector('#foto').files.length
      ? 'Foto selecionada; upload ainda indisponível' : 'Sem foto anexada';
    const selected = contactFromForm(data);
    document.querySelector('#review-contact').textContent = `${selected.channel === 'email' ? 'E-mail' : 'Telefone'}: ${selected.contact}`;
  }

  function showStep(next) {
    step = next;
    steps.forEach((section) => { section.hidden = Number(section.dataset.step) !== step; });
    if (step === 4) review();
    steps[step - 1].querySelector('h1').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  form.querySelectorAll('[name="contact-channel"]').forEach((radio) => radio.addEventListener('change', channelChanged));
  [email, phone].forEach((input) => input.addEventListener('input', () => {
    proof = '';
    challengeId = '';
    panel.hidden = true;
    feedback.textContent = 'Contato alterado. Gere e confirme outro código.';
  }));
  channelChanged();

  requestCode.addEventListener('click', async () => {
    const input = email.disabled ? phone : email;
    if (!input.reportValidity()) return;
    requestCode.disabled = true;
    try {
      const result = await request('/api/dev/verification', { method: 'POST', body: JSON.stringify(contactFromForm(new FormData(form))) });
      challengeId = result.challengeId;
      proof = '';
      panel.hidden = false;
      document.querySelector('#demo-code').textContent = `Código local: ${result.demoCode}`;
      feedback.textContent = 'Digite o código acima. Nenhum e-mail ou SMS foi enviado.';
      document.querySelector('#verification-code').focus();
    } catch (error) { feedback.textContent = error.message; }
    finally { requestCode.disabled = false; }
  });

  verifyCode.addEventListener('click', async () => {
    if (!challengeId) { feedback.textContent = 'Gere um código primeiro.'; return; }
    verifyCode.disabled = true;
    try {
      const result = await request('/api/dev/verify', { method: 'POST', body: JSON.stringify({ challengeId, code: document.querySelector('#verification-code').value.trim() }) });
      proof = result.proof;
      panel.hidden = true;
      feedback.textContent = 'Contato fictício verificado. Continue para revisar o relato.';
    } catch (error) { feedback.textContent = error.message; }
    finally { verifyCode.disabled = false; }
  });

  form.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => {
    const fields = steps[step - 1].querySelectorAll('input:not([disabled]), textarea');
    for (const field of fields) { if (!field.reportValidity()) return; }
    if (step === 3 && !proof) { feedback.textContent = 'Confirme o contato fictício antes de continuar.'; return; }
    showStep(Math.min(step + 1, 4));
  }));
  form.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => showStep(Math.max(step - 1, 1))));
  form.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.edit))));
  document.querySelector('#foto').addEventListener('change', (event) => {
    document.querySelector('#foto-nome').textContent = event.target.files[0]?.name || 'Adicionar uma foto';
    document.querySelector('#remove-photo').hidden = !event.target.files.length;
  });
  document.querySelector('#remove-photo').addEventListener('click', () => {
    document.querySelector('#foto').value = '';
    document.querySelector('#foto-nome').textContent = 'Adicionar uma foto';
    document.querySelector('#remove-photo').hidden = true;
    document.querySelector('#submit-feedback').textContent = '';
  });
  form.addEventListener('submit', (event) => event.preventDefault());

  document.querySelector('#enviar-demo').addEventListener('click', async (event) => {
    const submitFeedback = document.querySelector('#submit-feedback');
    if (!proof) { submitFeedback.textContent = 'Volte e confirme o contato.'; return; }
    if (document.querySelector('#foto').files.length) {
      submitFeedback.textContent = 'Foto ainda não é salva no serviço local. Remova o arquivo para enviar este teste.';
      return;
    }
    event.currentTarget.disabled = true;
    submitFeedback.textContent = 'Salvando relato fictício…';
    try {
      const result = await request('/api/dev/reports', { method: 'POST', body: JSON.stringify(reportFromForm(new FormData(form), proof, idempotencyKey)) });
      form.hidden = true;
      document.querySelector('#confirmation-protocol').textContent = result.protocol;
      document.querySelector('#confirmation-link').href = `acompanhar.html?protocolo=${encodeURIComponent(result.protocol)}`;
      document.querySelector('#confirmation').hidden = false;
      document.querySelector('#confirmation').scrollIntoView({ block: 'start' });
    } catch (error) {
      submitFeedback.textContent = error.message;
      event.currentTarget.disabled = false;
    }
  });
}

const lookup = document.querySelector('#consulta-protocolo');
if (lookup) {
  const result = document.querySelector('#resultado');
  const notFound = document.querySelector('#nao-encontrado');
  async function search(protocol) {
    try {
      const report = await request(`/api/dev/reports/${encodeURIComponent(protocol.trim().toUpperCase())}`);
      result.hidden = false;
      notFound.hidden = true;
      document.querySelector('#result-status').textContent = report.status;
      document.querySelector('#result-category').textContent = report.category;
      document.querySelector('#result-protocol').textContent = report.protocol;
    } catch (error) {
      result.hidden = true;
      notFound.hidden = false;
      notFound.textContent = error.message;
    }
  }
  lookup.addEventListener('submit', (event) => { event.preventDefault(); search(document.querySelector('#protocolo').value); });
  const fromLink = new URLSearchParams(location.search).get('protocolo');
  if (fromLink) {
    document.querySelector('#protocolo').value = fromLink;
    search(fromLink);
  }
}
