export const etapas = Object.freeze({
  recebida: 'Em análise', validada: 'Validada', encaminhada: 'Encaminhada ao órgão',
  resolvida: 'Resolvida', rejeitada: 'Rejeitada'
});
export const transicoes = Object.freeze({
  recebida: ['validada', 'rejeitada'], validada: ['encaminhada', 'resolvida'],
  encaminhada: ['resolvida'], resolvida: [], rejeitada: []
});
export const dataLocal = valor => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Recife'
}).format(new Date(valor));
