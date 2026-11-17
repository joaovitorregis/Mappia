export function contactFromForm(data) {
  const channel = String(data.get('contact-channel') ?? '');
  if (channel !== 'email' && channel !== 'phone') throw new Error('Escolha e-mail ou telefone.');
  const contact = String(data.get(channel) ?? '').trim();
  if (!contact) throw new Error('Informe o contato escolhido.');
  return { channel, contact };
}

export function reportFromForm(data, proof, idempotencyKey) {
  return {
    category: String(data.get('tipo') ?? '').trim(),
    description: String(data.get('descricao') ?? '').trim(),
    location: String(data.get('endereco') ?? '').trim(),
    proof,
    idempotencyKey,
  };
}
