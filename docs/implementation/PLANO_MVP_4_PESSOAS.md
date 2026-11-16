# Plano de implementação do MVP Mappia — equipe de quatro pessoas

Data: 15/11/2026. Base: PRD e Product Backlog v3.2, jornada e auditoria de prontidão. Este documento organiza trabalho; não afirma que o backend ou os fluxos descritos já existem.

## Objetivo e limite

Entregar um fluxo verificável: morador escolhe **e-mail ou telefone**, confirma esse contato, envia um relato sem conta, recebe protocolo, acompanha o estado, pode criar/entrar em conta e ver apenas seus relatos; a equipe modera antes da publicação no mapa. Não pedir CPF nem tornar nome obrigatório. O piloto com moradores só começa depois dos critérios de privacidade, segurança, operação e usabilidade abaixo.

O repositório hoje tem HTML/CSS/JavaScript demonstrativo. `relatar.html` ainda pede CPF e termina na revisão; `acompanhar.html` usa um protocolo fictício; não há backend. O Figma 04/05 foi ajustado parcialmente, 09 tem lacuna de layout, 10 não contempla SMS e as telas de verificação não existem. Os **32 itens M** do backlog são o escopo documental; **96 pontos** é uma estimativa antiga, não a capacidade da equipe.

## Quatro frentes e regra de colaboração

Por decisão do usuário, a divisão permanece **por função**, sem atribuição de nomes ou suposição de experiência. Cada entrega tem uma pessoa responsável e outra revisora; a revisão roda entre as quatro. Quem modificar contrato compartilhado avisa as outras frentes antes de alterar a interface.

| Frente | Responsabilidade principal | Arquivos/artefatos sob cuidado | Interface com as outras |
| --- | --- | --- | --- |
| A — Experiência e front-end | Fechar Figma; formulário, confirmação, conta e acompanhamento responsivos | Figma, `relatar.html`, `acompanhar.html`, `css/mappia.css`, módulos de interface em `js/` | Consome contrato HTTP e estados de erro definidos com B/C |
| B — Dados e serviço de relatos | Escolha técnica com a equipe; persistência, protocolo, fotos, consulta e projeção pública | migrações/regras e serviço em diretórios definidos no ADR técnico | Publica contrato de relatos para A/D; recebe prova de contato de C |
| C — Identidade e proteção de acesso | Verificação de e-mail/SMS, conta opcional, vínculo, permissões e limites | módulo de autenticação, regras de acesso e testes de autorização | Entrega identificador interno e prova de posse a B; estados de autenticação a A |
| D — Mapa, moderação e qualidade | Mapa público, fila do gestor, indicadores, testes de ponta a ponta e operação | `index.html`, painel do gestor, testes de integração/usabilidade, roteiro operacional | Consome projeção pública de B e permissões de C |

Não abrir quatro mudanças simultâneas no mesmo HTML, CSS ou Figma. A e D combinam a divisão de `css/mappia.css`; B e C definem juntos chaves, políticas e operações antes de editar a mesma migração. Alterações ficam em branches próprias de cada integrante, integradas por PR com uma revisão; registros do João Vitor seguem `João-Vitor`.

## Contratos que precisam ser fechados antes de persistir dados

1. **Backend:** registrar um ADR curto comparando Firebase e Supabase para contato verificado, conta já existente, SMS, regras de acesso, armazenamento, custo e ambiente local. Supabase é hipótese técnica, não decisão do Mappia. Escolher um para o MVP e criar projeto isolado do Aedes.
2. **Vínculo do relato:** definir o que ocorre quando há sessão de envio ativa, quando ela se perde e quando o contato já pertence a uma conta. Protocolo ou igualdade de texto do contato nunca bastam para reivindicar autoria. Decidir como ligar e-mail e telefone à mesma conta sem gerar duas contas para a mesma pessoa.
3. **Consulta por protocolo:** definir quais campos são visíveis a quem só conhece o protocolo. A resposta pública deve ter estado e resumo seguro; contato, coordenada exata e foto privada não podem vazar.
4. **Localização pública e foto:** fixar precisão/ocultação do ponto público, regra de publicação de imagem, retirada de metadados EXIF e revisão de conteúdo. O backlog põe EXIF em S, mas foto e mapa são M; publicar foto real sem essa proteção é uma lacuna do escopo.
5. **Operação:** decidir quem modera, critérios de validar/rejeitar, retenção/exclusão, texto de privacidade, provedor e orçamento de SMS. Sem isso, só dados fictícios em ambiente de teste.

## Sequência de entregas

As etapas são marcos de integração, não semanas ou promessas de prazo. A ordem respeita as dependências; tarefas dentro de um marco podem rodar em paralelo quando não compartilham arquivo ou contrato.

### Marco 0 — Contrato e protótipo coerentes

| Frente | Entrega | Critério de pronto |
| --- | --- | --- |
| A | Concluir Figma 04/05/09/10, criar estados de escolha de canal, código enviado, inválido, expirado, reenvio, conta existente e histórico; testar navegação e atualizar `docs/design/JORNADA.md`. | Uma pessoa percorre sem atalhos relato → contato verificado → protocolo → sem conta ou conta → histórico; nenhum caminho exige CPF ou ambos os contatos. |
| A + D | Fixar os IDs das seis categorias usados pelo formulário, mapa, filtros e testes, registrando a fonte do levantamento. | Os nomes e IDs são idênticos nos quatro lugares. Cobre 8.1. |
| B | Escrever ADR do backend e contrato de dados/serviço: relato privado, resumo por protocolo, projeção pública, protocolo único, chave de idempotência e transições de estado. | A/C/D aprovam exemplos de entrada e saída, permissões e erros; backend escolhido e orçamento de teste conhecido. |
| C | Desenhar matriz de posse e acesso para visitante, autor, conta existente e moderador; prototipar OTP em ambiente de teste sem SMS pago. | Reivindicação por contato apenas digitado ou protocolo é negada; expiração e limite de tentativas estão especificados. |
| D | Definir regra de localização/foto pública e roteiro de moderação; preparar casos de teste ponta a ponta e dados fictícios. | Publicação depende de validação; o roteiro cobre rejeição, foto inadequada e ausência de moderador. |

**Portão:** nenhum envio real ou trabalho dependente de fornecedor começa sem o ADR e os contratos 1–5. É possível iniciar testes e interface com dados fictícios enquanto as decisões são fechadas.

### Marco 1 — Base técnica e primeiro relato fictício

| Pacote | Responsável | Depende de | Entrega e prova |
| --- | --- | --- | --- |
| 1.1 Ambiente e contratos | B, revisão C | Marco 0 | Configurar ambiente local/teste, variáveis de exemplo sem segredos, migração inicial e contrato de erros. Teste cria e consulta um relato fictício; ambiente de produção permanece separado. Cobre 8.3. |
| 1.2 Acesso mínimo | C, revisão B | 1.1 | Regras negam leitura de contato/foto privada e escrita de estado por visitante. Testes fazem chamadas sem interface e recebem negação. Cobre 8.4. |
| 1.3 Formulário sem CPF | A, revisão D | Figma do marco 0 | Atualizar `relatar.html` e extrair lógica de `js/figma.js` para módulos pequenos: categoria, descrição, local/foto opcional, canal escolhido, revisão e estados de erro. Teste no navegador em celular e desktop; não envia antes da verificação. Cobre 1.1–1.6 e 8.5. |
| 1.4 Gravação e protocolo | B, revisão D | 1.1–1.2 | Serviço valida payload, aceita foto opcional, grava uma vez por chave de idempotência, gera protocolo único e inicia em **Em análise**. Na prova local, recebe apenas comprovante de contato simulado e restrito ao ambiente de teste; não libera rota pública sem verificação real. Falha não retorna sucesso; repetição não duplica. Cobre 1.7. |
| 1.5 Consulta restrita por protocolo | B + A, revisão C | 1.4 | Substituir resultado fixo de `acompanhar.html` por resposta real de teste, com estado e resumo seguro. Protocolo errado não revela existência de contato ou foto privada. Cobre 4.1. |
| 1.6 Preparação do mapa e moderação | D, revisão A | contrato do marco 0 | Criar componentes de mapa vazio/carregando/erro e fila de moderação com dados fictícios, sem publicar registros privados. Testar navegação e responsividade; integrar com serviço apenas no marco 3. |

**Portão:** um relato fictício atravessa navegador → verificação simulada local → serviço → armazenamento → consulta; nenhum segredo entra no repositório e nenhuma rota pública aceita comprovante simulado. Esta é a primeira entrega funcional de código.

### Marco 2 — Contato verificado e conta opcional

| Pacote | Responsável | Depende de | Entrega e prova |
| --- | --- | --- | --- |
| 2.1 Verificar o contato escolhido | C + A, revisão B | Marco 1 | Código/link por e-mail **ou** código SMS de teste; expiração, tentativa, reenvio, troca de canal e preservação do formulário em falha. O serviço só aceita envio com prova válida para aquele relato. Verificação não cria conta permanente. Cobre 1.11. |
| 2.2 Cadastro depois do protocolo | C + A, revisão D | 2.1 | Confirmação mantém protocolo e oferece criar conta ou continuar sem ela. E-mail/senha e telefone/SMS criam ou acessam conta conforme o canal; falha no cadastro não perde relato. Cobre 2.1, 2.2 e 2.8. |
| 2.3 Vínculo e histórico | B + C, revisão A | 2.2 e contrato de vínculo | Vínculo usa sessão de envio ou prova adicional aprovada. Conta já existente e sessão perdida são testadas. Outra conta não apropria relato; histórico lista apenas registros próprios. Cobre 2.3 e 4.2. |
| 2.4 Abuso e custo | C, revisão D | 2.1 | Limites de solicitação de código e de relatos, verificação antirobô validada no serviço, mensagens compreensíveis e observabilidade de volume/custo. Testes recusam excesso sem bloquear permanentemente um usuário legítimo. Cobre 5.1 e 5.2. |
| 2.5 Regressão da jornada | D, revisão A | 2.1–2.3 | Teste de ponta a ponta percorre os dois canais, recusa cadastro, conta existente, sessão perdida e código expirado; falha mantém relato e não mistura históricos. |

**Portão:** a jornada sem conta continua válida; as duas formas de acesso funcionam em ambiente de teste e não misturam históricos. SMS real só entra após fornecedor, custo e privacidade aprovados.

### Marco 3 — Moderação, mapa e indicadores

| Pacote | Responsável | Depende de | Entrega e prova |
| --- | --- | --- | --- |
| 3.1 Fila e estados | D + B, revisão C | Marcos 1–2 | Moderador autenticado valida/rejeita e muda estado; trilha registra quem e quando. Visitante e autor não conseguem chamar operações administrativas. Cobre 5.3–5.5. |
| 3.2 Projeção pública | B, revisão D | 3.1 e regra de localização/foto | Consulta pública expõe apenas ocorrências validadas e campos aprovados; **Em análise** e rejeitadas não aparecem nem por URL direta. Testes conferem privacidade e precisão da localização. Sustenta 3.1–3.3. |
| 3.3 Mapa e filtros | D + A, revisão B | 3.2 | Substituir mapa estático por Leaflet, seis categorias do formulário, legenda dos estados e detalhe público. Falha de carregamento e mapa vazio têm estado visível. Cobre 3.1–3.4. |
| 3.4 Indicadores | D, revisão B | 3.2 | Contagens usam somente ocorrências validadas e seguem os mesmos estados do mapa. Teste com dados mistos exclui Em análise e rejeitadas. Cobre 6.1. |

**Portão:** relato novo não aparece no mapa até validação; rejeitado permanece fora de mapa e indicadores; um usuário sem permissão não consegue moderar pelo serviço.

### Marco 4 — Piloto responsável

| Frente | Entrega | Critério de pronto |
| --- | --- | --- |
| C + B | Política, retenção/exclusão, proteção de fotos, custos e limites de SMS, observação de erros e cópias de segurança. | Revisão documentada com dados reais mínimos; contatos e fotos nunca entram em logs ou projeções públicas. Cobre 8.6. |
| A + D | Teste de usabilidade com moradores nas tarefas enviar sem conta, guardar protocolo, acompanhar e entrar por cada canal; corrigir problemas encontrados. | Evidência de conclusão/dificuldade registrada e correções retestadas. Cobre 8.7 e 8.8. |
| Equipe inteira | Ensaio de operação: moderação diária, falha de SMS, foto inadequada, pedido de exclusão e restauração. | Uma pessoa responsável pela fila está nomeada; critérios do PRD são demonstrados em ambiente de teste. |

**Portão:** só então considerar envio de moradores e publicação de dados reais. Itens S/C continuam fora deste plano, salvo controles de privacidade necessários para não expor dados ao cumprir itens M.

## Como começar sem pisar no trabalho dos outros

1. Reunião curta das quatro pessoas: atribuir os nomes às frentes A–D e confirmar disponibilidade, backend, custo de SMS e quem revisa cada entrega. Não usar os 96 pontos antigos para prometer data; reestimar 1.11, 2.8 e os itens afetados.
2. Abrir quatro pacotes iniciais com responsáveis: A fecha Figma e formulário sem CPF; B escreve ADR e contrato de relatos; C prova verificação/vínculo em teste; D define publicação/moderação e testes. A/B/C/D concordam com o contrato antes de integração.
3. Integrar primeiro **1.1 → 1.4 → 1.5** com dados fictícios. Depois fazer 2.1–2.4. Cada PR demonstra o critério de pronto do pacote; teste e revisão antecedem integração.
4. Manter o trabalho do João Vitor registrado em `João-Vitor`. Os demais integrantes decidem suas próprias branches; não assumir uma branch em nome deles.

## Cobertura dos 32 itens M

| Marco | IDs |
| --- | --- |
| 0 e 4 | 8.1, 8.2, 8.6, 8.7, 8.8 |
| 1 | 1.1–1.7, 4.1, 8.3, 8.4, 8.5 |
| 2 | 1.11, 2.1–2.3, 2.8, 4.2, 5.1, 5.2 |
| 3 | 3.1–3.4, 5.3–5.5, 6.1 |

Os IDs 1.8–1.10, 2.4–2.7 e demais S/C não estão prometidos; os controles de foto, contato e privacidade descritos aqui são condições para usar dados reais, ainda que a estimativa antiga os tenha classificado fora de M.
