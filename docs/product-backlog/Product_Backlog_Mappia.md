# Mappia

Product Backlog

Versão 3.1 documental | 22/10/2026 (estimativas históricas de 02/10/2026)

Projeto de extensão de Ciência da Computação da UNINASSAU Campina Grande, na disciplina Atividades Práticas Interdisciplinares de Extensão I.

## Equipe

- [João Vitor Regis](https://github.com/joaovitorregis)
- [Ryan Cavalcante](https://github.com/Ryancscarvalho)
- [Joalison Normandia](https://github.com/joalisonnormandia)
- [Jhonatan Xavier](https://github.com/jhonatandevpb)


## Contrato da demonstração - revisão de 22/10/2026

Esta revisão usa o HTML/JavaScript deste repositório como referência de capacidade implementada e o arquivo Figma `sXNaua5CmhShdvoC4J4upn` como referência canônica de design. O canvas não foi alterado nem revalidado nesta revisão. O arquivo `IY3T4Dv7QenJZWPRxngnf3` é uma referência histórica, não a fonte atual.

| Fluxo | Disponível na demonstração | Ainda previsto |
| --- | --- | --- |
| Mapa (`index.html`) | Prévia estática; links para Relatar e Acompanhar. | Pinos interativos, filtros efetivos, GPS, moderação e contagens públicas por estado. |
| Relato (`relatar.html`) | Quatro etapas; categoria, descrição e endereço; seleção local de foto; dados fictícios; revisão e edição. | Envio, persistência, upload, protocolo real e verificação antiabuso. |
| Consulta (`acompanhar.html`) | Exemplo fixo MAP-2026-00428 e aviso para código não encontrado. | Consulta a registros reais, atualização de estados e histórico autenticado. |
| Conta | Botões informam indisponibilidade; entrada desabilitada no início. | Cadastro, autenticação, vínculo e recuperação de senha (2.6, prioridade S). |

Na etapa de dados pessoais, nome completo, CPF, telefone e e-mail são obrigatórios apenas para percorrer a demonstração. Use dados fictícios. O navegador verifica preenchimento e formato básico do e-mail; não verifica CPF, identidade, titularidade do contato ou consentimento. Os valores permanecem no formulário em memória; o código não os envia, não grava em banco ou armazenamento local e não cria conta. A foto é apenas selecionada no aparelho. Isso não constitui coleta segura em produção nem política de privacidade. A hospedagem e recursos externos podem receber requisições técnicas de carregamento, sem envio dos campos pelo código da aplicação.

Para produção, a necessidade de cada identificador, especialmente CPF, finalidade, base legal, retenção, exclusão, acesso restrito e conteúdo do aviso precisam ser decididos antes de habilitar coleta. A identificação desenhada não é um requisito de coleta em produção aprovado por esta revisão. O cadastro ilustrado usa nome, e-mail e senha; nome e vínculo de conta ainda exigem revisão de escopo.

O catálogo desta revisão acompanha os seis rótulos do formulário: Buracos na rua, Iluminação pública, Lixo e descarte irregular, Vazamentos e esgoto a céu aberto, Alagamentos e Outro problema. Acessibilidade e sinalização pertenciam ao catálogo anterior; podem ser descritas em Outro problema, sem categorias próprias nesta demonstração. O mapa atual não executa filtros; a implementação futura deve usar o mesmo catálogo do formulário (1.2 e 8.1).

Em análise é o estado inicial previsto; Relato recebido nas exportações antigas representa recebimento, não validação. O exemplo HTML de consulta é fictício e usa Em análise, sem representar publicação no mapa. Somente Pendente, Crítico e Resolvido podem aparecer no mapa e nos indicadores futuros após validação. As imagens exportadas são históricas: a tela 07 ilustra consulta por protocolo, não uma lista autenticada; a tela 08 não comprova validação. Não há exportação atualizada dos estados públicos nem do histórico autenticado. As imagens não foram retocadas para simular essa atualização.

Os 55 IDs e os totais históricos (183 pontos; MVP: 30 itens M e 96 pontos) foram preservados. A troca de catálogo e as questões de identificação/conta exigem reestimação antes da implementação de produção; os números de 02/10/2026 não comprovam cobertura dessas decisões. Critérios do MVP abaixo são metas futuras, não funcionalidades concluídas ou resultados de teste com moradores.

## Referência e situação

Este backlog acompanha o [PRD do Mappia, versão 3.1 documental](../prd/PRD_Mappia.md). Os itens descrevem requisitos planejados e seus critérios de aceitação.

O produto contempla registro de problemas urbanos, mapa público e acompanhamento. O cadastro do morador é opcional após o envio. Equipe e comerciantes usam contas autenticadas para suas operações restritas.

## Prioridades e estimativas

M: essencial para o MVP. S: evolução importante. C: evolução desejável. Os pontos medem esforço relativo e não equivalem a horas ou prazo. A implementação do MVP depende de todos os itens M, incluindo moderação e indicadores.

| Épico | Tema | M | S | C |
| --- | --- | --- | --- | --- |
| 1 | Relato sem conta | 19 | 10 | 0 |
| 2 | Cadastro opcional após o envio | 9 | 8 | 3 |
| 3 | Mapa colaborativo | 13 | 8 | 2 |
| 4 | Acompanhamento | 6 | 9 | 3 |
| 5 | Prevenção de abuso e moderação | 17 | 12 | 0 |
| 6 | Painel de indicadores | 3 | 3 | 5 |
| 7 | Recursos da comunidade | 0 | 8 | 13 |
| 8 | Base técnica e entrega | 29 | 3 | 0 |
|  | Total | 96 | 61 | 26 |

São 55 itens e 183 pontos no planejamento completo. O MVP contém 30 itens e 96 pontos.

## Regras comuns

- O visitante acessa o mapa, registra uma ocorrência e consulta o protocolo sem criar conta.
- O convite de cadastro aparece após a confirmação. Dispensar o convite não apaga o registro.
- Cada envio persistido recebe um protocolo único e começa em Em análise.
- A equipe valida o registro como Pendente ou Crítico, ou o classifica como Rejeitado. Uma ocorrência validada pode passar a Resolvido.
- O mapa e os indicadores públicos usam apenas ocorrências validadas. Em análise e Rejeitado ficam fora das contagens públicas.
- A consulta por protocolo permite acompanhar o registro sem expor dados privados do autor. O protocolo não dá permissão para editar, moderar ou vincular um registro a uma conta.
- O registro recém-enviado é vinculado à conta criada na mesma sessão. O vínculo de registros anteriores do aparelho é uma evolução prevista no item 2.4.
- Contas da equipe exigem autenticação e permissão administrativa. O cadastro de comerciantes, previsto após o MVP, também exige conta.
- A classificação Crítico indica prioridade da ocorrência. Ela não representa um acionamento de emergência ou garantia de atendimento.
- O encaminhamento a órgãos responsáveis é uma evolução do item 5.6. O registro não garante atendimento ou resolução pelo poder público.

As categorias iniciais são Buracos na rua, Iluminação pública, Lixo e descarte irregular, Vazamentos e esgoto a céu aberto, Alagamentos e Outro problema. Os critérios abaixo são condições de aceitação para a implementação futura.

## Épico 1. Relato sem conta

| ID | Item | Prioridade | Pontos | Critério de aceitação |
| --- | --- | --- | --- | --- |
| 1.1 | Acessar o formulário sem conta | M | 2 | A ação Relatar um problema abre o formulário sem pedir login ou cadastro. |
| 1.2 | Selecionar a categoria | M | 2 | O formulário oferece Buracos na rua, Iluminação pública, Lixo e descarte irregular, Vazamentos e esgoto a céu aberto, Alagamentos e Outro problema; a categoria selecionada acompanha o registro. |
| 1.3 | Descrever o problema | M | 1 | A descrição é solicitada no formulário e fica associada à ocorrência; a ausência de texto impede a confirmação do envio. |
| 1.4 | Informar a localização por mapa ou GPS | M | 5 | O local pode ser marcado no mapa ou obtido com autorização para GPS. A recusa de GPS mantém a marcação manual disponível. |
| 1.5 | Anexar foto do problema | M | 5 | O envio pode ser concluído sem foto. Quando anexada, a foto acompanha a ocorrência. Falhas no upload são informadas antes de apresentar o envio como concluído. |
| 1.6 | Exibir aviso de privacidade antes do envio | M | 2 | O formulário explica o uso da descrição, localização e foto e permite acessar a política de privacidade antes da confirmação. Qualquer futura coleta de nome, CPF, telefone ou e-mail depende da decisão de necessidade e finalidade, aviso específico e controles dos itens 8.4 e 8.6; os campos fictícios da demonstração não comprovam esse aceite. |
| 1.7 | Confirmar o envio e gerar protocolo | M | 2 | Após persistir o registro, o sistema apresenta um protocolo único e o estado Em análise. Um envio com falha não gera confirmação de sucesso. |
| 1.8 | Avisar sobre possível duplicata | S | 5 | Registros semelhantes próximos ao local informado são apresentados para consulta antes de criar outra ocorrência. |
| 1.9 | Confirmar Também vejo esse problema | S | 3 | Um visitante sem conta consegue confirmar uma ocorrência existente; a contagem não cria uma ocorrência nova. |
| 1.10 | Remover metadados EXIF da foto | S | 2 | A imagem disponibilizada pelo sistema não contém os metadados EXIF de localização presentes no arquivo recebido. |

## Épico 2. Cadastro opcional após o envio

| ID | Item | Prioridade | Pontos | Critério de aceitação |
| --- | --- | --- | --- | --- |
| 2.1 | Oferecer cadastro após confirmar o registro | M | 3 | O convite de cadastro aparece depois da confirmação e mantém o protocolo visível ou acessível. |
| 2.2 | Dispensar o cadastro | M | 1 | A opção de dispensar o cadastro permite continuar sem conta; o registro e a consulta por protocolo permanecem disponíveis. |
| 2.3 | Criar conta e vincular o registro atual | M | 5 | A conta é criada com e-mail e senha; o nome ilustrado no design depende da revisão de escopo descrita no contrato da demonstração. O registro do envio recém-concluído é vinculado à conta autenticada, sem permitir apropriar registros apenas pelo protocolo. |
| 2.4 | Vincular registros anteriores do aparelho | S | 3 | Após autenticação, registros anteriores associados à sessão do aparelho são vinculados à conta; registros de outras sessões não são vinculados. |
| 2.5 | Consultar registros em outro aparelho | S | 3 | Ao autenticar a mesma conta em outro aparelho, o morador acessa a lista de registros vinculados a ela. |
| 2.6 | Recuperar senha por e-mail | S | 2 | O morador solicita recuperação e conclui a troca de senha pelo fluxo de autenticação, sem expor a senha anterior. |
| 2.7 | Entrar por link enviado ao e-mail | C | 3 | Um link de autenticação enviado ao e-mail permite acessar a conta sem digitar senha. |

## Épico 3. Mapa colaborativo

| ID | Item | Prioridade | Pontos | Critério de aceitação |
| --- | --- | --- | --- | --- |
| 3.1 | Exibir ocorrências no mapa público | M | 5 | O mapa Leaflet abre sem conta e mostra a localização das ocorrências validadas para divulgação. |
| 3.2 | Distinguir os estados das ocorrências | M | 2 | Os estados têm texto e cor. O mapa público mostra Pendente, Crítico e Resolvido; Em análise aparece no acompanhamento do envio e na fila da equipe. |
| 3.3 | Abrir o detalhe de uma ocorrência | M | 3 | Selecionar um pino apresenta categoria, descrição, foto disponível e estado; o detalhe público não exibe a identidade do autor. |
| 3.4 | Filtrar o mapa por categoria | M | 3 | O filtro altera os pinos exibidos conforme a categoria e permite voltar à lista completa de ocorrências públicas. |
| 3.5 | Buscar rua ou ponto de referência | S | 3 | A busca localiza a rua ou o ponto informado e permite visualizar sua região no mapa. |
| 3.6 | Exibir camadas temáticas | S | 5 | O visitante consegue alternar camadas de reciclagem, comércio, serviços públicos e alertas quando seus dados estiverem cadastrados. |
| 3.7 | Agrupar pinos próximos | C | 2 | Pinos próximos são agrupados conforme o zoom; aproximar o mapa permite selecionar cada ocorrência. |

## Épico 4. Acompanhamento

| ID | Item | Prioridade | Pontos | Critério de aceitação |
| --- | --- | --- | --- | --- |
| 4.1 | Consultar pelo protocolo sem conta | M | 3 | Um protocolo válido apresenta o estado e os dados públicos de acompanhamento. Um protocolo inexistente apresenta mensagem de registro não encontrado. |
| 4.2 | Listar os registros da conta | M | 3 | A lista contém apenas registros vinculados à conta autenticada e permite abrir o acompanhamento de cada um. |
| 4.3 | Copiar link de uma ocorrência | S | 1 | O link copiado abre a consulta pública do registro, sem divulgar dados privados do autor. |
| 4.4 | Consultar histórico de estados | S | 3 | O acompanhamento apresenta as mudanças de estado com data e texto compreensível ao morador. |
| 4.5 | Receber aviso de mudança de estado | S | 5 | A conta vinculada recebe um aviso quando o estado muda, respeitando a preferência de recebimento. |
| 4.6 | Sugerir resolução com foto | C | 3 | O morador envia uma foto de resolução; o estado só muda para Resolvido após confirmação da equipe. |

## Épico 5. Prevenção de abuso e moderação

| ID | Item | Prioridade | Pontos | Critério de aceitação |
| --- | --- | --- | --- | --- |
| 5.1 | Verificar envios contra robôs | M | 3 | O envio exige verificação antiabuso válida, como reCAPTCHA; a verificação é conferida no processamento da solicitação. |
| 5.2 | Limitar a frequência de envios | M | 3 | O sistema aplica limite por identificador de sessão ou aparelho e intervalo configurado; requisições acima do limite recebem recusa clara. |
| 5.3 | Restringir o acesso da equipe | M | 3 | Somente uma conta autenticada com permissão de moderação consegue acessar operações administrativas. |
| 5.4 | Validar ou rejeitar a ocorrência | M | 5 | A fila apresenta registros Em análise. Validar libera o conteúdo revisado para divulgação; rejeitar mantém o registro fora do mapa e dos indicadores públicos. |
| 5.5 | Alterar o estado de uma ocorrência | M | 3 | A equipe autorizada altera o estado; visitantes não conseguem efetuar essa mudança. A ocorrência preserva protocolo e autoria interna. |
| 5.6 | Encaminhar ao órgão responsável | S | 5 | A equipe registra o encaminhamento de uma ocorrência validada ao canal escolhido, sem apresentar o encaminhamento como solução concluída. |
| 5.7 | Sinalizar conteúdo falso ou ofensivo | S | 2 | Uma sinalização cria uma solicitação de revisão para a equipe, sem alterar automaticamente o estado da ocorrência. |
| 5.8 | Unir registros duplicados | S | 3 | A equipe identifica o registro principal e relaciona os duplicados; os protocolos anteriores continuam indicando o destino da ocorrência. |
| 5.9 | Ocultar dados pessoais em fotos | S | 2 | A equipe consegue ocultar ou retirar imagens que exponham rostos, placas ou dados pessoais antes de disponibilizar a versão pública. |

## Épico 6. Painel de indicadores

| ID | Item | Prioridade | Pontos | Critério de aceitação |
| --- | --- | --- | --- | --- |
| 6.1 | Contar ocorrências validadas por estado | M | 3 | As contagens de Crítico, Pendente e Resolvido usam apenas registros validados; Em análise e Rejeitado não compõem os totais públicos. |
| 6.2 | Apresentar categorias mais frequentes | S | 3 | O painel agrupa registros validados por categoria e informa as contagens utilizadas. |
| 6.3 | Exportar resumo em PDF ou CSV | C | 5 | O arquivo exportado contém as informações públicas selecionadas e não inclui dados de identificação do autor. |

## Épico 7. Recursos da comunidade

| ID | Item | Prioridade | Pontos | Critério de aceitação |
| --- | --- | --- | --- | --- |
| 7.1 | Cadastrar estabelecimento comercial | S | 5 | Um comerciante autenticado cadastra as informações do estabelecimento para divulgação na camada de comércio. |
| 7.2 | Mapear pontos de descarte de resíduos | S | 3 | Pontos cadastrados aparecem na camada de reciclagem com localização e identificação do serviço. |
| 7.3 | Publicar alertas comunitários | C | 5 | Somente a equipe autorizada publica alertas de emergência; o mapa distingue alertas de ocorrências comuns. |
| 7.4 | Registrar doações e voluntariado | C | 8 | Moradores autenticados cadastram ofertas ou pedidos de mantimentos e trabalho voluntário. |

## Épico 8. Base técnica e entrega

| ID | Item | Prioridade | Pontos | Critério de aceitação |
| --- | --- | --- | --- | --- |
| 8.1 | Levantar dados e definir categorias | M | 5 | O levantamento registra fontes e categorias utilizadas; as seis categorias do item 1.2 têm a mesma identificação no PRD, formulário e filtro. |
| 8.2 | Preparar protótipo navegável | M | 3 | O protótipo permite percorrer mapa, formulário, confirmação e convite opcional, incluindo a opção de continuar sem conta. |
| 8.3 | Configurar serviços Firebase | M | 5 | A configuração prevê autenticação anônima e por e-mail, banco de ocorrências e armazenamento de imagens, com ambientes de desenvolvimento separados dos dados de uso. |
| 8.4 | Aplicar regras de acesso aos dados | M | 3 | As regras permitem criação controlada por sessão anônima, leitura pública somente de dados liberados e operações administrativas apenas por contas autorizadas. |
| 8.5 | Implementar interface responsiva | M | 3 | Mapa, formulário e acompanhamento são utilizáveis em celular e desktop, sem perda de campos ou ações essenciais. |
| 8.6 | Documentar privacidade e termos de uso | M | 2 | A política descreve os dados tratados, sua finalidade, acesso, armazenamento e canal para solicitações; os documentos ficam acessíveis no fluxo de envio e cadastro. |
| 8.7 | Realizar teste de usabilidade com moradores | M | 5 | As tarefas incluem enviar sem conta, guardar o protocolo e acompanhar o registro; o teste registra tempo, conclusão, dificuldades e satisfação. |
| 8.8 | Corrigir problemas do teste | M | 3 | Os problemas encontrados no teste têm correções registradas; as tarefas afetadas são verificadas novamente após os ajustes. |
| 8.9 | Divulgar o projeto | S | 3 | Os materiais de divulgação informam o acesso e o funcionamento do registro e acompanhamento, respeitando a fase disponível do produto. |

## Dependências de implementação

| Grupo | Dependências principais |
| --- | --- |
| Registro e protocolo (1.1 a 1.7) | Categorias (8.1), serviços de dados (8.3), regras de acesso (8.4), privacidade (8.6) e controles antiabuso (5.1 e 5.2). |
| Cadastro opcional (2.1 a 2.3) | Confirmação e protocolo (1.7), autenticação (8.3) e vínculo autorizado (8.4). |
| Mapa público (3.1 a 3.4) | Validação (5.4), estados (5.5) e leitura pública controlada (8.4). |
| Acompanhamento (4.1 e 4.2) | Persistência do protocolo (1.7), estado (5.5) e vínculo com conta (2.3). |
| Moderação (5.3 a 5.5) | Autenticação e autorização (8.3 e 8.4). |
| Indicadores (6.1) | Validação (5.4) e estados (5.5). |
| Teste e ajustes (8.7 e 8.8) | Fluxos M integrados em ambiente de teste; o protótipo de 8.2 apoia a preparação. |
| Comércio e comunidade (7.1 a 7.4) | Camadas temáticas (3.6), autenticação e regras de acesso compatíveis com cada função. |

## Aceitação do MVP

- Todos os itens M atendem aos seus critérios, com registros de verificação.
- O visitante conclui envio e acompanhamento sem criar conta.
- A conta opcional vincula o registro da sessão correta.
- Apenas a equipe autorizada valida e altera estados; conteúdo em análise ou rejeitado fica fora do mapa público e dos indicadores.
- O teste de usabilidade mede tempo de envio, conclusão sem ajuda e satisfação. As metas propostas são até 2 minutos, pelo menos 80% de conclusão e SUS de pelo menos 70, conforme o PRD.
- A meta proposta de análise é de até 48 horas, medida em uma avaliação de operação.

## Histórico da revisão

Versão 3.0, 02/10/2026: adoção do nome Mappia, critérios de aceitação por item e dependências explícitas. Os 55 IDs, as prioridades e os pontos foram preservados. O total do MVP permanece em 96 pontos.

Versão 3.1 documental, 22/10/2026: contrato da demonstração, categorias do HTML, referência Figma canônica, estados e limites das exportações históricas. Estimativas preservadas como históricas; reestimação pendente para alterações de escopo.
