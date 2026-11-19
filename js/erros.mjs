const mensagens = {
  CONTATO_INVALIDO: 'Confira o e-mail ou o telefone informado.',
  VERIFICACAO_INDISPONIVEL: 'A verificação de apresentação está indisponível.',
  CODIGO_INVALIDO: 'Código incorreto. Confira os seis dígitos.',
  CODIGO_EXPIRADO: 'O código expirou. Gere outro código.',
  TENTATIVAS_ESGOTADAS: 'Tentativas esgotadas. Gere outro código.',
  LIMITE_CODIGOS: 'Limite de códigos atingido para este contato. Tente mais tarde.',
  LIMITE_RELATOS: 'Limite diário de relatos atingido para este contato.',
  CONTATO_NAO_VERIFICADO: 'Confirme um novo código antes de enviar o relato.',
  RELATO_INVALIDO: 'Confira a descrição, o ponto de referência e o pino no mapa.',
  IDEMPOTENCIA_CONFLITO: 'O envio anterior já usou dados diferentes. Confira seus protocolos.',
  FOTO_INVALIDA: 'A foto não está disponível. Remova e selecione a imagem de novo.',
  ACESSO_GESTOR: 'Esta conta não tem acesso ao painel.',
  TRANSICAO_INVALIDA: 'Esta mudança de etapa não é permitida. Atualize o relato.',
  RELATO_INEXISTENTE: 'Relato não encontrado.',
  OBSERVACAO_INVALIDA: 'A observação comporta até 1.000 caracteres.',
  invalid_credentials: 'E-mail ou senha incorretos.',
  user_already_exists: 'Já existe uma conta com este e-mail. Use a opção Entrar.',
  weak_password: 'Escolha uma senha com pelo menos seis caracteres.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde um pouco e tente novamente.'
};
export function erroAmigavel(erro) {
  return mensagens[erro?.code] ?? mensagens[erro?.message] ??
    'A operação falhou. Confira a conexão e tente novamente.';
}
