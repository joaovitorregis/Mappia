# Roteiro de apresentação do Mappia

Use apenas dados fictícios na demonstração de Campina Grande, Paraíba. Deixe o painel do gestor aberto no computador e combine quem fará a validação ao vivo.

[Link público](https://joaovitorregis.github.io/Mappia/) · [Painel do gestor](https://joaovitorregis.github.io/Mappia/gestor/)

![QR do Mappia de apresentação](qr-mappia.png)

## Ensaio com dois celulares e o computador

1. Abra o link público ou o QR no primeiro celular. Confira se o mapa carrega e filtre uma categoria.
2. Em **Relatar**, escolha uma categoria e descreva um problema fictício. Marque um ponto no mapa, informe uma referência inventada e, se quiser, use uma foto de teste. Escolha um contato fictício exclusivo. Distribua um número diferente a cada aluno para usar no e-mail, como `aluno23@example.com`, ou no final do telefone de exemplo. Digite o código mostrado na tela, revise e envie.
3. Copie o protocolo. Abra **Acompanhar** no outro celular e consulte o protocolo. O resultado começa em **Em análise**.
4. No computador, entre em **Painel do gestor**, abra a ocorrência pelo protocolo e confira o mapa e a foto. Altere a etapa para **Validada**.
5. No segundo celular, recarregue o acompanhamento e confira a nova etapa. Recarregue também o mapa público e verifique o pino e a contagem. O mapa mostra a localização aproximada.
6. No primeiro celular, crie uma conta com um e-mail fictício pelo link da confirmação. Confira se o relato aparece em **Meus relatos**. O vínculo usa um token deste aparelho.
7. Confira o tempo de resposta com a rede que a turma vai usar. Para turmas com mais de 30 pessoas no mesmo Wi-Fi, organize a criação das contas em grupos espaçados. O Supabase documenta um pico padrão de 30 requisições de cadastro por IP. Se aparecer um erro 429 no ensaio, confira os limites do projeto e repita o teste com os grupos espaçados. [Limites do Supabase Auth](https://supabase.com/docs/guides/auth/rate-limits)

Ao concluir, registre o protocolo fictício, os navegadores dos dois celulares, o resultado da publicação no mapa e se houve erro de limite. Esses quatro itens confirmam a execução do ensaio sem incluir senhas ou contatos.

## Se a internet cair

Mostre as telas já carregadas ou o [protótipo navegável no Figma](https://www.figma.com/proto/sXNaua5CmhShdvoC4J4upn/Mappia?node-id=2031-152&page-id=0%3A1&starting-point-node-id=2031%3A152&scaling=scale-down) enquanto houver acesso ao cache. Guarde também capturas do ensaio para uma demonstração sem conexão. Quando a rede voltar, retome pelo protocolo já anotado ou confira se o relato chegou ao painel antes de reenviar.

## Após a apresentação

Siga a seção de limpeza do [guia Supabase](SUPABASE_SETUP.md), excluindo primeiro os arquivos de teste pelo Storage e executando o reset dos registros em seguida.
