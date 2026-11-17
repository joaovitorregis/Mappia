# Plano de implementação — Mappia para apresentação

Data: 17/11/2026. Este plano é para ser entregue ao GPT (Codex/ChatGPT) **uma fase por vez**. Cada fase termina com algo que funciona e pode ser testado antes de passar para a próxima.

## Como usar este plano com o GPT

1. Na primeira mensagem, cole as seções **Contexto**, **Regras** e **Decisões** inteiras.
2. Depois peça: "Faça a Fase 1". Quando ela estiver pronta e testada, peça a Fase 2, e assim por diante.
3. Ao fim de cada fase, confira o **Pronto quando** antes de seguir. Se algo falhar, peça a correção antes de avançar.
4. As tarefas marcadas como **[Você]** são suas: o GPT não consegue criar contas nem mexer no painel do Supabase por você.

---

## Contexto

O Mappia é um site para moradores relatarem problemas urbanos (buraco, iluminação, lixo, vazamento, alagamento), acompanharem o relato por protocolo e verem as ocorrências num mapa. Uma equipe (gestor) confere cada relato e muda a etapa dele. É um projeto de extensão de Ciência da Computação (UNINASSAU Campina Grande).

**Objetivo desta versão:** funcionar de verdade, online, para uma **apresentação aos alunos**. Na apresentação, os alunos abrem o link no celular, relatam um problema, recebem o protocolo, e o relato aparece no painel do gestor e, depois de validado, no mapa público. Usa só dados de teste; não é para moradores reais nesta versão.

**O que já existe no repositório** (`github.com/joaovitorregis/Mappia`, branch `João-Vitor`):

- `index.html` (mapa estático + filtros sem função), `relatar.html` (formulário em 4 etapas), `acompanhar.html` (consulta por protocolo), `css/mappia.css` (identidade visual — manter).
- `relatar.html` já tem: 6 categorias (`name="tipo"`), descrição, endereço/referência, seleção de foto, escolha de contato e-mail **ou** telefone (`name="contact-channel"`), botão de gerar código, campo do código, revisão e tela de confirmação com protocolo.
- `js/report-ui.mjs` e `js/report-flow.mjs`: lógica do formulário, hoje falando com um servidor local de teste.
- `dev/server.mjs` + `dev/report-store.mjs`: servidor Node que guarda tudo **na memória** (some ao reiniciar). Será substituído pelo Supabase.
- `tests/*.test.mjs`: 9 testes com `node --test tests/*.test.mjs`.
- Documentos: `docs/prd/PRD_Mappia.md`, `docs/product-backlog/Product_Backlog_Mappia.md`, `docs/design/JORNADA.md`, `docs/design/telas/*.png` (telas antigas do Figma).
- Figma (referência visual): `https://www.figma.com/design/sXNaua5CmhShdvoC4J4upn/Mappia`. Seção "02 · Painel do gestor" tem as telas G0–G5 descritas na Fase 7.

## Regras para o GPT

- Trabalhe na branch atual `João-Vitor`. Não crie branches novas.
- Commits com autor João Vitor Regis. **Não** adicione "Co-Authored-By", menção a IA ou assinatura de ferramenta em commits ou PRs.
- Nunca coloque a chave `service_role` (secreta) do Supabase no código do site ou no repositório. O site usa só a chave pública (anon/publishable), protegida pelas regras de acesso (RLS).
- Site estático: HTML, CSS e JavaScript (módulos ES), sem framework e sem etapa de build. Bibliotecas por CDN com **versão fixa** (ex.: `@supabase/supabase-js@2.45.4`, `leaflet@1.9.4`).
- Interface em português, pensada primeiro para celular (testar em 360 px e em desktop). Manter `css/mappia.css` e o visual atual; acrescentar estilos, não reescrever.
- Não pedir CPF nem nome. O morador informa **um** contato: e-mail ou telefone.
- Manter o painel do gestor **simples** (lista, mapa, detalhe, mudar etapa). Não criar triagem, relatórios, equipe, auditoria ou outras telas que não estão aqui.
- Cada fase termina com: código, testes que passam, README atualizado se o modo de rodar mudou, e um resumo do que foi feito e do que não foi.

## Decisões

| Tema | Decisão |
| --- | --- |
| Backend | **Supabase** (Postgres + RLS, Auth, Storage). Toda lógica sensível em **funções SQL (RPC)**, sem Edge Functions. |
| Hospedagem | **GitHub Pages** (HTTPS, necessário para o GPS do celular). |
| Mapa | **Leaflet** com mapa base do OpenStreetMap (com a atribuição exigida). Centro inicial: Campina Grande (-7.2307, -35.8811). |
| Categorias (6, iguais em todo lugar) | `buracos` Buracos na rua · `iluminacao` Iluminação pública · `lixo` Lixo e descarte irregular · `vazamentos` Vazamentos e esgoto a céu aberto · `alagamentos` Alagamentos · `outro` Outro problema |
| Etapas | `recebida` → `validada` → `encaminhada` → `resolvida`, e `rejeitada`. Para o morador, `recebida` aparece como **"Em análise"**. |
| Transições permitidas | recebida → validada ou rejeitada · validada → encaminhada ou resolvida · encaminhada → resolvida. Rejeitada e resolvida são finais. |
| O que é público | Só ocorrências **validada, encaminhada ou resolvida**. Recebida e rejeitada nunca aparecem no mapa, nos filtros nem nas contagens, nem por URL direta. |
| Localização pública | Coordenada arredondada para 3 casas decimais (~100 m). A exata fica só para o gestor. |
| Foto | Opcional. O navegador redimensiona (lado maior 1600 px) e regrava em JPEG antes de enviar — isso também remove os dados EXIF (como localização do aparelho). Fica em bucket **privado**; só o gestor vê. O mapa público **não** mostra fotos nesta versão. |
| Verificação do contato | Código de 6 dígitos gerado no banco. **Modo apresentação:** o código aparece na tela com o aviso "Modo apresentação: em uso real, este código chegaria por e-mail ou SMS". Nenhum e-mail ou SMS é enviado. Verificar o contato **não** cria conta. |
| Conta do morador (opcional, depois do protocolo) | E-mail + senha pelo Supabase Auth, com confirmação de e-mail **desligada** (modo apresentação). Telefone + código SMS só se os números de teste do Supabase funcionarem sem provedor pago (ver Fase 6); senão, a opção de telefone fica escondida por configuração. |
| Vínculo do relato com a conta | Ao enviar, o banco devolve um **token secreto** do relato, guardado no `localStorage` do aparelho. Depois de entrar/criar conta, o site chama `vincular_relatos(tokens)`. Saber o protocolo ou digitar o mesmo contato **não** basta para vincular. Se o morador já estiver logado ao enviar, o relato já nasce vinculado. |
| Gestor | Entra com e-mail e senha (Supabase Auth). Só quem está na tabela `gestores` tem acesso. Contas de gestor são criadas à mão no painel do Supabase. |
| Anti-abuso (simples) | No banco: no máximo 5 códigos por contato por hora, 5 tentativas por código, código vale 10 min, prova de contato vale 15 min e serve para um único relato, no máximo 10 relatos por contato por dia. |

---

## Fase 0 — Preparar o Supabase

**[Você]** antes de pedir ao GPT:

1. Criar conta e um projeto novo em supabase.com (separado do Aedes). Região: São Paulo.
2. Em *Authentication → Sign In / Providers → Email*: deixar **Email** ligado e **desligar "Confirm email"**.
3. Em *Project Settings → API*: copiar a **Project URL** e a chave **anon/publishable** (a pública). **Não** compartilhe a `service_role`.

**GPT:** escrever `docs/implementation/SUPABASE_SETUP.md` com esses passos, como aplicar as migrações (SQL Editor ou `supabase db push`), como criar o primeiro gestor e como zerar os dados depois da apresentação.

**Pronto quando:** o documento existe e você tem a URL e a chave pública em mãos.

## Fase 1 — Banco de dados, regras e funções

**GPT:** criar `supabase/migrations/0001_mappia.sql` (e seguintes) com:

Tabelas (todas com RLS ligado e **sem** políticas de leitura/escrita direta para `anon`, exceto onde dito):

- `categorias(id text pk, nome text)` — as 6 da tabela de decisões.
- `gestores(user_id uuid pk references auth.users)`.
- `configuracao(chave text pk, valor jsonb)` — `modo_apresentacao = true`.
- `verificacoes(id uuid pk, canal text check in ('email','telefone'), contato text, codigo_hash text, tentativas int, expira_em timestamptz, verificado_em timestamptz, prova_hash text, prova_expira_em timestamptz, prova_usada boolean, criado_em timestamptz)`.
- `relatos(id uuid pk, protocolo text unique, categoria text references categorias, descricao text (5–1000 caracteres), referencia text (até 300), lat double precision, lng double precision, foto_path text null, canal text, contato text, usuario_id uuid null references auth.users, token_hash text, chave_idempotencia text unique, etapa text check in (...5 etapas), criado_em, atualizado_em)`.
- `historico_etapas(id bigserial, relato_id uuid, de text, para text, observacao text null, gestor_id uuid null, criado_em)`.

Protocolo no formato `MAP-AAAA-XXXXXXXX` (8 caracteres hexadecimais aleatórios), único.

Funções (`security definer`, `set search_path = public`, `grant execute` só para quem precisa). Códigos e tokens guardados **em hash** (sha256 via `extensions.digest`):

| Função | Quem chama | Faz |
| --- | --- | --- |
| `iniciar_verificacao(canal, contato)` | anon, authenticated | Valida formato (e-mail simples; telefone com 10–11 dígitos), aplica limite por hora, cria código. Retorna `verificacao_id` e, se `modo_apresentacao`, o `codigo_demo`. |
| `confirmar_codigo(verificacao_id, codigo)` | anon, authenticated | Confere expiração e tentativas. Se certo, retorna uma `prova` (token aleatório) válida por 15 min. Erros com códigos claros: `CODIGO_INVALIDO`, `CODIGO_EXPIRADO`, `TENTATIVAS_ESGOTADAS`. |
| `criar_relato(prova, categoria, descricao, referencia, lat, lng, foto_path, chave_idempotencia)` | anon, authenticated | Exige prova válida e não usada (`CONTATO_NAO_VERIFICADO`), valida campos e coordenadas, aplica limite diário. Mesma chave de idempotência devolve o mesmo resultado sem duplicar. `foto_path` só aceito se começar com `pendentes/` e existir no bucket. Grava etapa `recebida`, histórico inicial, `usuario_id = auth.uid()` se logado. Retorna `protocolo` e `token` (secreto, mostrado só uma vez). |
| `consultar_protocolo(protocolo)` | anon, authenticated | Retorna só: protocolo, categoria, etapa (rótulo do morador), datas e linha do tempo de etapas (sem observações internas). Nunca contato, coordenada exata ou foto. Protocolo inexistente → resultado vazio, sem dizer mais nada. |
| `ocorrencias_publicas(categoria null)` | anon, authenticated | Só etapas públicas; coordenada arredondada; campos: protocolo, categoria, etapa, referencia, criado_em. |
| `indicadores_publicos()` | anon, authenticated | Contagem por etapa pública (validada, encaminhada, resolvida). |
| `vincular_relatos(tokens text[])` | authenticated | Liga ao `auth.uid()` os relatos cujo `token_hash` confere e que ainda não têm dono. Retorna quantos vinculou. |
| `meus_relatos()` | authenticated | Lista os relatos do usuário logado (campos seguros + etapa + datas). |
| `sou_gestor()` | authenticated | Retorna true/false. |
| `gestor_listar(periodo, categoria)` | authenticated (checa gestor) | Lista todos os relatos, com período `hoje`, `7d`, `30d` ou todos. Campos completos (incluindo coordenada exata e se tem foto). |
| `gestor_detalhe(id)` | authenticated (checa gestor) | Relato completo + histórico com observações. |
| `gestor_alterar_etapa(id, nova_etapa, observacao)` | authenticated (checa gestor) | Só transições permitidas (`TRANSICAO_INVALIDA` se não). Grava histórico com gestor e data. |

Storage: bucket privado `fotos`, limite 5 MB, tipos `image/jpeg`, `image/png`, `image/webp`. Política: `anon` e `authenticated` podem **inserir** apenas em `pendentes/<uuid>.jpg`; ninguém além de gestor pode **ler** (o painel usa URL assinada).

Também: `supabase/seed.sql` com ~15 ocorrências fictícias espalhadas por Campina Grande em todas as etapas e categorias (para o mapa não começar vazio) e `supabase/reset_apresentacao.sql` que apaga relatos, histórico, verificações e fotos de teste (mantendo categorias, configuração e gestores).

**[Você]:** rodar as migrações e o seed no projeto; criar um usuário gestor em *Authentication → Users* e inserir o `user_id` dele em `gestores`.

Datas e o filtro "Hoje" usam o fuso `America/Recife`. Criar `package.json` com `@supabase/supabase-js` (versão fixa) só como dependência de desenvolvimento, para os testes em Node; o site continua carregando a biblioteca pelo CDN.

**Pronto quando:** um teste automatizado (`tests/supabase.smoke.test.mjs`, rodado com `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GESTOR_EMAIL`, `GESTOR_SENHA` em variáveis de ambiente, nunca no repositório) faz pelo `supabase-js`: verificar contato → criar relato → consultar protocolo (sem contato no retorno) → confirmar que **não** aparece em `ocorrencias_publicas` → gestor valida → agora aparece com coordenada arredondada. E também prova que: anon não lê a tabela `relatos` diretamente; anon não consegue chamar `gestor_alterar_etapa`; prova reaproveitada é recusada; chave de idempotência repetida não duplica.

## Fase 2 — Base do site

**GPT:**

- `js/config.js` com `SUPABASE_URL`, `SUPABASE_ANON_KEY` (chave pública, pode ir no repositório), `MODO_APRESENTACAO = true`, `TELEFONE_ATIVO = false`.
- `js/supabase.mjs`: cria o cliente uma vez e exporta funções pequenas para cada RPC, traduzindo os códigos de erro para mensagens em português.
- `js/categorias.mjs` e `js/etapas.mjs`: ids, nomes, cores e rótulos (incluindo "Em análise" para `recebida`) usados por todas as telas.
- Apagar `dev/report-store.mjs` e os testes dele; `dev/server.mjs` passa a só servir os arquivos estáticos do projeto para desenvolvimento local (qualquer arquivo dentro da pasta, sem permitir sair dela), sem rotas `/api`.
- Faixa discreta "Modo apresentação · dados de teste" no topo de todas as páginas quando `MODO_APRESENTACAO`.

**Pronto quando:** `node dev/server.mjs` abre o site, as páginas carregam sem erro no console e os testes de módulos puros (categorias, etapas, mensagens de erro) passam.

## Fase 3 — Relatar

**GPT:** ligar `relatar.html` ao Supabase, mantendo as 4 etapas atuais.

1. **Problema:** categoria (6) e descrição.
2. **Local e foto:** mapa Leaflet com pino arrastável; botão "Usar minha localização" (GPS, com mensagem clara se negado); campo de ponto de referência; foto opcional com prévia, compressão no navegador e botão remover. O pino é obrigatório; o texto de referência também.
3. **Contato:** escolher e-mail **ou** telefone; "Enviar código" chama `iniciar_verificacao`; em modo apresentação mostra o código na tela; "Confirmar" chama `confirmar_codigo`. Estados visíveis: código enviado, código errado, expirado, tentativas esgotadas, "gerar novo código", trocar de canal. Sem prova, não dá para avançar. Aviso de privacidade curto antes do envio.
4. **Revisão:** resumo com mapa pequeno, foto, contato verificado; botões de editar cada parte.
5. **Envio:** sobe a foto (se houver) para `pendentes/<uuid>.jpg`, chama `criar_relato` com uma chave de idempotência gerada uma vez por tentativa (clicar duas vezes não duplica). Em falha, mantém tudo preenchido e mostra o erro.
6. **Confirmação:** mostra o protocolo grande com botão copiar, guarda `{protocolo, token}` em `localStorage` (`mappia.meusRelatos`), e oferece "Acompanhar este relato", "Criar conta para guardar meus relatos" e "Continuar sem conta".

**Pronto quando:** pelo celular (ou viewport 360 px), um relato com foto e um sem foto chegam ao banco; o relato aparece em `gestor_listar`; a foto no bucket não tem EXIF; recarregar a página no meio não quebra; duplo clique em enviar gera um único protocolo.

## Fase 4 — Acompanhar por protocolo

**GPT:** `acompanhar.html` usa `consultar_protocolo`. Mostra categoria, etapa atual em destaque e linha do tempo (Em análise → Validada → Encaminhada ao órgão → Resolvida; Rejeitada quando for o caso, com texto explicando). Aceita protocolo pela URL (`acompanhar.html?p=MAP-...`), que é o link do botão da confirmação. Lista também os protocolos guardados neste aparelho (`localStorage`) para um toque. Protocolo inexistente: "Não encontramos esse protocolo. Confira se digitou certo."

**Pronto quando:** o protocolo recém-criado abre direto pelo link; ao gestor mudar a etapa, recarregar a página mostra a nova etapa; nada de contato, coordenada exata ou foto aparece na resposta (conferir na aba Rede do navegador).

## Fase 5 — Mapa público

**GPT:** `index.html` com Leaflet no lugar da imagem estática.

- Pinos de `ocorrencias_publicas`, com cor por categoria e indicação da etapa por texto/ícone (não só por cor).
- Filtros por categoria funcionando (chips das 6 + "Todas"); botão de localização; zoom.
- Ao tocar no pino: cartão com categoria, etapa, referência, data e link "Ver acompanhamento".
- Contagens no topo (`indicadores_publicos`): Validadas, Encaminhadas, Resolvidas.
- Estados: carregando, erro com "Tentar de novo", e "Nenhuma ocorrência nesta categoria".

**Pronto quando:** o seed aparece no mapa; um relato novo **não** aparece até o gestor validar; uma rejeitada nunca aparece; contagens batem com os pinos.

## Fase 6 — Conta do morador

**GPT:**

- `conta.html` com abas **Entrar** e **Criar conta** por e-mail e senha (Supabase Auth). Mensagens para senha curta, e-mail já cadastrado, senha errada.
- Telefone: tentar *Authentication → Phone* com **números de teste** do Supabase (número fixo + código fixo). Se o Supabase exigir credenciais de um provedor SMS pago para ligar o telefone, deixar `TELEFONE_ATIVO = false` e registrar isso no README. Não contratar provedor.
- Depois de entrar ou criar conta: chamar `vincular_relatos` com os tokens do `localStorage` e informar "X relatos foram ligados à sua conta".
- `meus-relatos.html`: lista de `meus_relatos()` com etapa e link para o acompanhamento; botão sair.
- O botão "Entrar" do topo passa a funcionar em todas as páginas e mostra o estado logado.

**Pronto quando:** relato enviado sem conta → criar conta na confirmação → relato aparece em "Meus relatos"; outra conta, em outro navegador, não vê nem consegue vincular esse relato, mesmo sabendo o protocolo.

## Fase 7 — Painel do gestor

**GPT:** pasta `gestor/`, seguindo as telas G0–G5 da seção "02 · Painel do gestor" do Figma (layout de desktop, funcionando também no celular):

- **G0 Entrar:** e-mail e senha; quem não está em `gestores` vê "Esta conta não tem acesso ao painel" e é desconectado.
- **G1 Ocorrências:** lista com filtros de período (Hoje, 7 dias, 30 dias) e das 6 categorias; cada linha mostra protocolo, categoria, referência, data e etapa; contador por etapa.
- **G2 Mapa:** os mesmos filtros, com todas as ocorrências (inclusive Recebida) e coordenada exata.
- **G3 Detalhe:** dados completos, foto (URL assinada), mapa pequeno e linha do tempo com observações.
- **G4 Alterar etapa:** mostra só as etapas permitidas a partir da atual; observação opcional; Rejeitar pede confirmação.
- **G5 Etapa alterada:** confirmação com a nova etapa e botão de voltar à lista.

**Pronto quando:** um gestor valida um relato e ele aparece no mapa público; uma transição proibida é recusada pelo banco mesmo se chamada pelo console; um usuário comum logado não consegue abrir dados do painel.

## Fase 8 — Publicar e ensaiar a apresentação

**GPT:**

- Publicar no GitHub Pages (via GitHub Actions a partir da branch que você indicar) e colocar o link no README.
- Atualizar README, `docs/design/JORNADA.md` e a seção "Estado da implementação" do PRD com o que funciona agora e o que continua fora (e-mail/SMS reais, moderação diária, uso com moradores).
- Escrever `docs/implementation/ROTEIRO_APRESENTACAO.md`: passo a passo da demonstração (abrir o link/QR code, aluno relata, gestor valida ao vivo no telão, pino aparece, aluno acompanha pelo protocolo, cria conta e vê "Meus relatos") e o que fazer se a internet cair.
- Gerar um QR code do link (imagem no repositório).

**[Você]:** ligar o GitHub Pages no repositório (*Settings → Pages → Source: GitHub Actions*); em *Authentication → Rate Limits* do Supabase, aumentar os limites de cadastro/entrada, porque toda a turma vai usar o mesmo Wi-Fi (mesmo IP); rodar o ensaio completo uma vez com outra pessoa e, depois da apresentação, rodar `reset_apresentacao.sql`.

**Pronto quando:** o roteiro inteiro funciona em dois celulares diferentes e no computador do gestor ao mesmo tempo, pelo link público.

---

## Fora desta versão

E-mail e SMS reais, provedor pago, captcha, duplicatas ("também vejo esse problema"), encaminhamento automático a órgãos, notificações, recuperação de senha, fotos no mapa público, exportação de relatórios, recursos da comunidade (comércio, doações, alertas) e uso com moradores reais (que exige política de privacidade, moderação diária e teste de usabilidade).

## Decisões assumidas para você conferir

- Etapas do painel do gestor (Recebida → Validada → Encaminhada → Resolvida, + Rejeitada) no lugar das do PRD (Pendente/Crítico); "Crítico" sai desta versão.
- 6 categorias em todo lugar, com "Outro problema" também no filtro do gestor.
- Fotos não aparecem no mapa público.
- Conta por telefone só se os números de teste do Supabase funcionarem de graça.
