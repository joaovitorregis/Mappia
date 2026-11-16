# Jornada do usuário

A jornada prevista do Mappia oferece dois caminhos principais: consultar ocorrências no mapa e registrar um problema. O acompanhamento pode ser feito por protocolo ou pelo histórico da conta.

[Protótipo navegável](https://www.figma.com/proto/sXNaua5CmhShdvoC4J4upn/Mappia?node-id=2031-152&page-id=0%3A1&starting-point-node-id=2031%3A152&scaling=scale-down) · [Arquivo de design](https://www.figma.com/design/sXNaua5CmhShdvoC4J4upn/Mappia?node-id=2045-121)

## Alinhamento de produto: 15/11/2026

Na jornada alvo, o relato pode ser enviado sem conta. Antes de confirmar o envio, o morador escolhe **e-mail ou telefone** e verifica esse único contato por código. O CPF sai do formulário; nome não é obrigatório. A verificação de contato não cria uma conta permanente. Após receber o protocolo, o morador pode continuar sem conta ou criar/entrar em uma conta por e-mail e senha ou telefone com código SMS. O vínculo do relato à conta exige prova segura de posse do contato ou da sessão que enviou o relato; digitar o protocolo ou um contato igual não basta.

O fluxo de verificação, seus estados de erro e o histórico autenticado ainda precisam ser desenhados e ligados no protótipo. A escolha do backend entre Firebase e Supabase permanece aberta.

### Estado do Figma após a revisão de 15/11/2026

| Tela | Estado verificado | Ajuste necessário antes de usar como referência de implementação |
| --- | --- | --- |
| 04 · Relatar | Título e texto orientam escolher e verificar um contato; CPF e nome foram retirados da composição visível. | Desenhar escolha exclusiva de e-mail **ou** telefone e estado de envio/verificação do código. O quadro ainda não demonstra a condição de bloqueio do envio. |
| 05 · Revisar | Resumo e seção mostram contato verificado, sem CPF. | Validar a ligação de “Editar contato” e representar falha/expiração da verificação. |
| 09 · Criar conta | Campo de nome retirado da composição visível; cadastro por e-mail/senha permanece. | Reorganizar o espaço vazio, desenhar a alternativa por telefone/SMS e comprovar o vínculo do relato após o cadastro. |
| 10 · Entrar | A tela antiga só mostra e-mail/senha. | Desenhar entrada por telefone/SMS, recuperação, erros e retorno ao histórico. |

As ligações do protótipo e as telas 06–08 não foram revalidadas nesta revisão. As imagens PNG abaixo continuam históricas e não representam esses ajustes no canvas.

## Revisão da demonstração: 22/10/2026

O Figma acima contém telas históricas e ajustes parciais da jornada alvo; não é ainda um fluxo completo de autenticação. As imagens abaixo são exportações históricas, sem data exata de exportação registrada. O [contrato da demonstração](../prd/PRD_Mappia.md#contrato-da-demonstração---revisão-de-22102026) separa HTML implementado, telas ilustradas e requisitos futuros.

## Registro de uma ocorrência

A ação “Relatar um problema”, na tela inicial, abre o formulário.

| Etapa | Informações |
| --- | --- |
| Problema | Categoria e descrição da ocorrência. |
| Local e foto | Posição do pino no mapa, endereço ou ponto de referência e foto opcional. |
| Contato | Na jornada alvo, um e-mail ou telefone verificado. A demonstração HTML ainda pede nome, CPF, telefone e e-mail fictícios. |
| Revisão | Conferência das informações antes do envio. |

No HTML, o morador pode voltar à etapa anterior ou editar as informações pela revisão. A confirmação com protocolo é prevista no design. O HTML termina na revisão e informa que nenhum envio ou protocolo real foi gerado.

Os quatro campos pessoais continuam obrigatórios somente na demonstração HTML, usando dados fictícios. Só há validação de preenchimento e formato básico de e-mail; não há verificação de CPF, contato ou identidade. A conta é opcional na jornada alvo e ainda não foi implementada.

## Consulta pelo mapa

Na jornada prevista, ao selecionar uma ocorrência no mapa, o morador acessa sua descrição, localização, estado e protocolo. A opção “Voltar ao mapa” retorna à consulta das ocorrências.

O mapa HTML é estático: seleção de pinos, filtros e GPS ainda não estão integrados. O catálogo do formulário usa Buracos na rua, Iluminação pública, Lixo e descarte irregular, Vazamentos e esgoto a céu aberto, Alagamentos e Outro problema.

## Acompanhamento e conta

O protocolo permite consultar o andamento sem conta no produto previsto. No HTML, apenas MAP-2026-00428 retorna um exemplo fictício Em análise. A tabela abaixo descreve destinos da jornada alvo, não ações funcionais no HTML. O histórico autenticado não está ilustrado neste conjunto de exportações.

| Ação | Destino |
| --- | --- |
| Acompanhar este relato | Consulta por protocolo. |
| Criar uma conta | Cadastro por e-mail e senha ou por telefone e código SMS. |
| Concluir o cadastro | Histórico dos relatos vinculados com prova de posse. |
| Continuar sem conta | Consulta por protocolo. |
| Já tenho conta | Entrada por e-mail e senha ou telefone e código SMS. |
| Entrar | Histórico de relatos. |
| Ainda não tenho conta | Cadastro. |

A tela de entrada também oferece retorno ao mapa.

## Telas

| Tela | Prévia |
| --- | --- |
| Início e mapa | [Imagem](telas/01-inicio.png) |
| Problema e descrição | [Imagem](telas/02-problema.png) |
| Local e foto | [Imagem](telas/03-local-e-foto.png) |
| Dados pessoais | [Imagem](telas/04-dados-pessoais.png) |
| Revisão | [Imagem](telas/05-revisao.png) |
| Confirmação e protocolo | [Imagem](telas/06-confirmacao.png) |
| Consulta por protocolo (sem lista autenticada) | [Imagem](telas/07-acompanhamento.png) |
| Detalhe da ocorrência | [Imagem](telas/08-detalhe.png) |
| Criar conta | [Imagem](telas/09-criar-conta.png) |
| Entrar | [Imagem](telas/10-entrar.png) |

As telas 06 a 08 são históricas: Relato recebido representa Em análise e não comprova validação para mapa público. O detalhe 08 não deve ser tomado como exemplo de publicação validada. Os estados públicos Pendente, Crítico e Resolvido ainda precisam de exportações atualizadas. A recuperação de senha ilustrada na tela 10 é evolução S (2.6). Cadastro, autenticação, envio, consulta real e histórico ainda dependem da implementação da aplicação.
