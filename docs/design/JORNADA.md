# Jornada do usuário

A jornada prevista do Mappia oferece dois caminhos principais: consultar ocorrências no mapa e registrar um problema. O acompanhamento pode ser feito por protocolo ou pelo histórico da conta.

[Protótipo navegável](https://www.figma.com/proto/sXNaua5CmhShdvoC4J4upn/Mappia?node-id=2031-152&page-id=0%3A1&starting-point-node-id=2031%3A152&scaling=scale-down) · [Arquivo de design](https://www.figma.com/design/sXNaua5CmhShdvoC4J4upn/Mappia?node-id=2045-121)

## Revisão da documentação: 22/10/2026

O Figma acima é a referência canônica de design; o canvas não foi alterado nesta revisão. As imagens abaixo são exportações históricas, anteriores a este alinhamento, sem data exata de exportação registrada. O [contrato da demonstração](../prd/PRD_Mappia.md#contrato-da-demonstração---revisão-de-22102026) separa HTML implementado, telas ilustradas e requisitos futuros.

## Registro de uma ocorrência

A ação “Relatar um problema”, na tela inicial, abre o formulário.

| Etapa | Informações |
| --- | --- |
| Problema | Categoria e descrição da ocorrência. |
| Local e foto | Posição do pino no mapa, endereço ou ponto de referência e foto opcional. |
| Dados pessoais | Nome completo, CPF, telefone e e-mail fictícios na demonstração; coleta real ainda depende de decisão de produto e privacidade. |
| Revisão | Conferência das informações antes do envio. |

No HTML, o morador pode voltar à etapa anterior ou editar as informações pela revisão. A confirmação com protocolo é prevista no design. O HTML termina na revisão e informa que nenhum envio ou protocolo real foi gerado.

Os quatro campos pessoais são obrigatórios para avançar na demonstração, usando dados fictícios. Só há validação de preenchimento e formato básico de e-mail; não há verificação de CPF ou identidade. A conta com senha é opcional na jornada prevista e ainda não foi implementada.

## Consulta pelo mapa

Na jornada prevista, ao selecionar uma ocorrência no mapa, o morador acessa sua descrição, localização, estado e protocolo. A opção “Voltar ao mapa” retorna à consulta das ocorrências.

O mapa HTML é estático: seleção de pinos, filtros e GPS ainda não estão integrados. O catálogo do formulário usa Buracos na rua, Iluminação pública, Lixo e descarte irregular, Vazamentos e esgoto a céu aberto, Alagamentos e Outro problema.

## Acompanhamento e conta

O protocolo permite consultar o andamento sem conta no produto previsto. No HTML, apenas MAP-2026-00428 retorna um exemplo fictício Em análise. A tabela abaixo descreve destinos previstos no design, não ações de conta funcionais no HTML. O histórico autenticado não está ilustrado neste conjunto de exportações.

| Ação | Destino |
| --- | --- |
| Acompanhar este relato | Consulta por protocolo. |
| Criar uma conta | Cadastro com nome, e-mail e senha. |
| Concluir o cadastro | Histórico de relatos. |
| Continuar sem conta | Consulta por protocolo. |
| Já tenho conta | Entrada com e-mail e senha. |
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
