# Mappia

O Mappia é um projeto de extensão voltado ao registro e acompanhamento de problemas urbanos. A proposta permite consultar ocorrências no mapa, relatar um problema e acompanhar seu andamento por protocolo.

O projeto está em fase de prototipação. Este repositório reúne requisitos, backlog, telas no Figma e uma primeira fatia funcional local com dados fictícios.

## Protótipo

![Telas do Mappia organizadas por jornada](docs/design/telas-organizadas.png)

- [Protótipo navegável](https://www.figma.com/proto/sXNaua5CmhShdvoC4J4upn/Mappia?node-id=2031-152&page-id=0%3A1&starting-point-node-id=2031%3A152&scaling=scale-down)
- [Arquivo de design](https://www.figma.com/design/sXNaua5CmhShdvoC4J4upn/Mappia?node-id=2045-121)
- [Visão geral das telas](docs/design/telas-organizadas.png)

Para testar o fluxo local, execute `node dev/server.mjs` na raiz e abra `http://127.0.0.1:4173`. O formulário permite escolher e verificar **um** contato fictício (e-mail `morador@example.com` ou telefone `00000000000`), usando um código mostrado na própria página. O envio gera um protocolo local, consultável enquanto o processo estiver aberto. Os registros ficam somente na memória e somem ao reiniciar o servidor. O código não envia e-mail nem SMS, não verifica a posse real do contato e não cria conta.

O CPF foi retirado do formulário. Envio e consulta com persistência real, conta opcional, histórico e autenticação por e-mail/senha ou SMS continuam previstos. Foto pode ser escolhida na interface, mas seu upload ainda não funciona; remova a seleção para enviar o teste. O mapa é uma prévia estática; filtros, GPS, moderação e indicadores não estão integrados. As imagens acima são exportações históricas; consulte a [matriz de capacidades](docs/prd/PRD_Mappia.md#estado-da-implementação-local---17112026).

O Figma ilustra a jornada pretendida e ainda requer atualização de estados. O servidor local é uma ferramenta de desenvolvimento, não um serviço de envio, autenticação ou atendimento.

## Escopo planejado do MVP

- Registro de ocorrências com categoria, descrição, localização e foto opcional.
- Contato verificado por e-mail ou telefone, sem CPF; coleta em produção depende de finalidade, proteção e serviço de verificação definidos.
- Acompanhamento por protocolo e histórico para moradores com conta.
- Mapa público com ocorrências validadas e filtros por categoria.
- Área de moderação e atualização do estado das ocorrências.
- Contagens públicas por estado, somente de ocorrências validadas.

## Documentação

- [Requisitos do produto](docs/prd/PRD_Mappia.md) · [PDF](docs/prd/PRD_Mappia.pdf)
- [Product Backlog](docs/product-backlog/Product_Backlog_Mappia.md) · [PDF](docs/product-backlog/Product_Backlog_Mappia.pdf)
- [Jornada do usuário](docs/design/JORNADA.md)
- [Plano de implementação para quatro pessoas](docs/implementation/PLANO_MVP_4_PESSOAS.md)
- [Telas do protótipo](docs/design/telas)

## Equipe

Projeto de quatro estudantes de Ciência da Computação da UNINASSAU Campina Grande, na disciplina Atividades Práticas Interdisciplinares de Extensão I.

- [João Vitor Regis](https://github.com/joaovitorregis)
- [Ryan Cavalcante](https://github.com/Ryancscarvalho)
- [Joalison Normandia](https://github.com/joalisonnormandia)
- [Jhonatan Xavier](https://github.com/jhonatandevpb)

## Licença

A documentação e os designs de autoria da equipe Mappia estão sob [CC BY 4.0](LICENSE), incluindo o PRD, o Product Backlog e o protótipo identificado neste README.

Autoria: João Vitor Regis, Ryan Cavalcante, Joalison Normandia e Jhonatan Xavier. Ao reutilizar, credite os autores, informe as alterações e inclua um link para a licença.

Elementos de terceiros conservam seus próprios direitos e licenças. A licença não concede direitos sobre marcas, imagem ou dados pessoais.
