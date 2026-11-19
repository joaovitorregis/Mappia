# Supabase para a apresentação do Mappia

Guia da Fase 0 do [plano de apresentação](PLANO_GPT_APRESENTACAO.md). Use um projeto exclusivo do Mappia com dados fictícios. A rotina de migração, a conta de gestor e a limpeza se aplicam assim que os arquivos da Fase 1 estiverem na branch `João-Vitor`.

## 1. Criar o projeto

1. Abra o [painel do Supabase](https://supabase.com/dashboard) e crie um projeto separado do Aedes Data Lab. Selecione a região **South America (São Paulo)** (`sa-east-1`). Guarde a senha do banco localmente. [Regiões do Supabase](https://supabase.com/docs/guides/platform/regions)
2. Em **Authentication → Sign In / Providers → Email**, mantenha o provedor de e-mail e o cadastro habilitados. Desative **Confirm email** para que as contas fictícias iniciem sessão durante a apresentação. [Configuração de autenticação](https://supabase.com/docs/guides/auth/general-configuration)
3. Abra **Connect** e anote a **Project URL** e a chave pública **Publishable** (`sb_publishable_...`). A chave pública legada `anon` também pode ser usada, se necessário. As chaves `service_role` e `sb_secret_...`, a senha do banco e a senha do gestor ficam fora do site e do Git. [Chaves de API](https://supabase.com/docs/guides/getting-started/api-keys)

A Fase 0 está pronta quando o projeto estiver criado, a configuração de e-mail estiver salva e você tiver a URL e a chave pública. O teste da Fase 1 usa esses valores em `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

## 2. Aplicar o banco da Fase 1

Com a CLI instalada, abra a raiz do repositório na branch `João-Vitor`. Se ainda não houver `supabase/config.toml`, rode `supabase init` uma vez. No PowerShell, substitua `REF_DO_PROJETO` pela referência do projeto Supabase que você criou para a apresentação.

```powershell
supabase login
supabase link --project-ref REF_DO_PROJETO
supabase db push --dry-run
supabase db push
supabase migration list --remote
```

Confira que a lista remota mostra as migrações locais como aplicadas. Para preparar o mapa, abra o **SQL Editor** no mesmo projeto e execute `supabase/seed.sql` uma vez. [Migrações no Supabase](https://supabase.com/docs/guides/deployment/database-migrations)

Como alternativa à CLI, use o **SQL Editor** para executar os arquivos de `supabase/migrations/` na ordem numérica, começando por `0001_mappia.sql`, e depois o `seed.sql`. Nesse caso, o histórico da CLI não é preenchido pelo editor. Antes de trocar de método, concilie o histórico com o banco para evitar reaplicar migrações.

Em um projeto que já recebeu `0001_mappia.sql`, aplique somente `0002_recuperar_token_envio.sql`. A migração preserva os relatos existentes. Se a primeira resposta de um envio novo se perder, uma repetição exata recupera o protocolo e a chave de vínculo enquanto o relato estiver sem conta.

## 3. Criar o primeiro gestor

1. Depois de aplicar as migrações, abra **Authentication → Users → Add user** e escolha a opção de criar um usuário. Use e-mail de teste e senha exclusiva para a apresentação. Marque a confirmação automática do usuário, se o painel oferecer essa opção. [Usuários do Supabase Auth](https://supabase.com/docs/guides/auth/users)
2. Copie o UUID do usuário criado. No **SQL Editor** do mesmo projeto, substitua o valor indicado e execute:

```sql
insert into public.gestores (user_id)
values ('UUID_DO_GESTOR')
on conflict (user_id) do nothing;
```

3. Com o gestor criado, a validação da Fase 1 usa `GESTOR_EMAIL` e `GESTOR_SENHA` no ambiente local do teste. A função `sou_gestor()` deve retornar `true` para essa conta.

### Rodar os testes da Fase 1

Na raiz, execute `npm ci` e `npm test`. A suíte local usa Postgres embutido com substitutos para os esquemas Auth e Storage. Ela carrega a migração, testa os papéis do banco, aplica o seed e executa o reset em uma base descartável.

Para validar o serviço hospedado, defina `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GESTOR_EMAIL` e `GESTOR_SENHA` no ambiente local. Execute no PowerShell:

```powershell
$env:MAPPIA_TEST_REMOTE = '1'
node --test tests/supabase.smoke.test.mjs
Remove-Item Env:MAPPIA_TEST_REMOTE
```

O teste hospedado cria e valida um relato fictício no projeto indicado. Sem `MAPPIA_TEST_REMOTE=1`, `npm test` roda a suíte local e sinaliza o teste hospedado como pulado.

### Contrato para a integração do site

- `confirmar_codigo` devolve `{ prova }` em caso de sucesso ou `{ erro }` para código incorreto, expirado ou tentativas esgotadas. Esse formato permite gravar a tentativa sem abortar a transação.
- `criar_relato` entrega a chave secreta ao criar um relato sem conta. Uma repetição exata recupera a chave de um relato criado após a migração 0002, enquanto ele estiver sem vínculo. Depois do vínculo, a repetição retorna só o protocolo. Alterar os dados sob a mesma chave retorna `IDEMPOTENCIA_CONFLITO`.
- As RPCs de verificação e criação exigem modo apresentação ativo. O código aparece na tela de demonstração e esta fase não envia e-mail ou SMS.

## 4. Limpar os dados depois da apresentação

1. Encerre o envio de novos relatos e confirme que abriu o projeto de apresentação do Mappia.
2. Em **Storage → fotos**, exclua os arquivos de teste pelo painel. A remoção física de fotos passa pelo Storage. [Remoção de arquivos no Supabase](https://supabase.com/docs/guides/storage/management/delete-objects)
3. No **SQL Editor**, execute `supabase/reset_apresentacao.sql` para limpar relatos, histórico e verificações, preservando categorias, configuração e gestores. A limpeza remove também os relatos de exemplo. Execute `supabase/seed.sql` novamente se quiser preparar outra sessão.
4. Confira que o bucket está vazio e que os relatos anteriores desapareceram do mapa e da consulta por protocolo. Contas de alunos criadas no Supabase Auth são separadas dos relatos. Se for necessário removê-las, faça a limpeza das contas de teste em **Authentication → Users**, preservando os gestores.
