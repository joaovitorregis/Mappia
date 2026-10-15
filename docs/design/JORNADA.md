# Jornada do usuário — Mappia

Retrato do protótipo no Figma em **15/10/2026**. Este documento registra as telas e as conexões do protótipo, sem representar serviços de cadastro ou envio já implantados.

- [Abrir o protótipo navegável](https://www.figma.com/proto/sXNaua5CmhShdvoC4J4upn/Mappia?node-id=2031-152&page-id=0%3A1&starting-point-node-id=2031%3A152&scaling=scale-down)
- [Abrir o arquivo de design](https://www.figma.com/design/sXNaua5CmhShdvoC4J4upn/Mappia?node-id=2045-121)

## Enviar e acompanhar um relato

1. **Início / mapa:** selecionar “Relatar um problema”.
2. **Problema — etapa 1 de 4:** escolher a categoria e descrever o problema. Voltar retorna ao mapa.
3. **Local e foto — etapa 2 de 4:** marcar o pino, complementar com endereço ou ponto de referência e adicionar foto. Voltar retorna ao problema.
4. **Dados pessoais — etapa 3 de 4:** informar nome completo, CPF, telefone e e-mail para identificação e contato. Esta etapa não cria uma conta. Voltar retorna ao local e foto.
5. **Revisão — etapa 4 de 4:** conferir as informações e enviar. “Editar informações” retorna ao problema; “Editar dados pessoais” e “Voltar” retornam aos dados pessoais.
6. **Confirmação:** consultar ou copiar o protocolo; acompanhar o relato ou optar por criar uma conta.
7. **Acompanhamento:** consultar por protocolo sem conta ou entrar para acessar os relatos vinculados à conta.

O acesso sem conta significa que não é necessário criar login e senha para relatar ou consultar um protocolo. O formulário atual possui uma etapa separada de identificação pessoal.

## As três telas inferiores

Essas telas são ramificações, não uma sequência obrigatória depois do acompanhamento.

| Tela | Entrada na jornada | Ações e destino |
| --- | --- | --- |
| Detalhe da ocorrência | Selecionar uma ocorrência no mapa. | “Voltar ao mapa” retorna ao início; as abas mantêm acesso ao relato e ao acompanhamento. |
| Criar conta — opcional | Convite após a confirmação ou “Ainda não tenho conta” na entrada. | “Criar conta” simula a sessão autenticada e abre o histórico; “Já tenho conta · Entrar” abre a entrada; “Continuar sem conta” abre o acompanhamento por protocolo. |
| Entrar na conta | Cabeçalho ou “Entrar ou criar conta” no acompanhamento. | “Entrar” simula a sessão autenticada e abre o histórico; “Ainda não tenho conta” abre o cadastro; “Voltar ao mapa” retorna ao início. |

O botão “Entrar” do cabeçalho possui conexão no texto, na superfície e no ícone das telas de origem. Na própria tela de entrada não há navegação para ela mesma.

## Telas atuais

| Ordem | Tela | Prévia | Nó no Figma |
| --- | --- | --- | --- |
| 01 | Início e mapa | [Imagem](telas/01-inicio.png) | `2031:152` |
| 02 | Problema e descrição | [Imagem](telas/02-problema.png) | `2031:232` |
| 03 | Local e foto | [Imagem](telas/03-local-e-foto.png) | `2031:285` |
| 04 | Dados pessoais | [Imagem](telas/04-dados-pessoais.png) | `2086:38` |
| 05 | Revisão | [Imagem](telas/05-revisao.png) | `2031:338` |
| 06 | Confirmação e protocolo | [Imagem](telas/06-confirmacao.png) | `2031:366` |
| 07 | Acompanhamento e histórico | [Imagem](telas/07-acompanhamento.png) | `2031:389` |
| 08 | Detalhe da ocorrência | [Imagem](telas/08-detalhe.png) | `2031:201` |
| 09 | Criar conta | [Imagem](telas/09-criar-conta.png) | `2031:414` |
| 10 | Entrar | [Imagem](telas/10-entrar.png) | `2031:439` |

![Visão geral da jornada atual](telas-organizadas.png)

## Alcance desta atualização

As imagens foram exportadas do arquivo atual do Figma. As conexões de avançar, voltar, detalhe, cadastro e entrada foram verificadas na estrutura do protótipo. Login, criação de conta, envio, geolocalização e anexos continuam sendo demonstrações. Os controles visuais de zoom e recuperação de senha não representam integrações funcionais.

Os PDFs do PRD e do backlog mantêm a versão 3.0, de 02/10/2026. A jornada acima registra a evolução posterior do protótipo, incluindo a etapa de dados pessoais e a revisão visual.
