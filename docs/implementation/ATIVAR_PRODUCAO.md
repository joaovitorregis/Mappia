# Ativação de relatos reais no Mappia

O endereço público usa a interface real com o envio fechado enquanto a configuração estiver incompleta. A migração 0003 separa os registros de apresentação e os retira das consultas, do painel e do mapa após o corte. Os dados antigos permanecem arquivados no Supabase anterior.

## 1. Preparar serviços e banco de produção

- Crie um projeto Supabase dedicado à operação real. Aplique as migrações 0001 a 0003 na ordem. Use o banco vazio resultante e crie as contas da equipe com identidades confirmadas. As sessões e contas da apresentação continuam no projeto anterior.
- Configure um remetente autenticado por domínio no SendGrid. No Twilio Verify, crie um serviço de seis dígitos para a verificação de relatos, habilite entrega no Brasil e conecte o canal de e-mail ao SendGrid. Confira limites e custos na conta antes de subir as quotas do Mappia. [Canal de e-mail no Twilio Verify](https://www.twilio.com/docs/verify/email) · [Permissões geográficas do Verify](https://www.twilio.com/docs/verify/geo-permissions)
- Configure no Supabase Auth o SMTP próprio, **Confirm email** ativo e a URL de confirmação no site Mappia. Para conta por telefone, configure o provedor SMS no Auth com serviço Verify separado do usado nos relatos. Remova números com códigos de teste. [SMTP do Supabase](https://supabase.com/docs/guides/auth/auth-smtp) · [Login por telefone](https://supabase.com/docs/guides/auth/phone-login)
- Crie um widget Turnstile para o hostname publicado. O navegador recebe a chave pública do widget. O servidor valida o token, o hostname e a ação `contato-envio`. [Validação Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

## 2. Publicar a função e testar a entrega

1. No Supabase de produção, configure os segredos da Edge Function `contato-verificacao`: `MAPPIA_ALLOWED_ORIGINS`, `TURNSTILE_SECRET_KEY`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET` e `TWILIO_VERIFY_SERVICE_SID`. A origem do GitHub Pages é `https://joaovitorregis.github.io`, sem caminho. A plataforma fornece `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Guarde segredos no painel ou em um cofre. [Segredos de Edge Functions](https://supabase.com/docs/guides/functions/secrets)
2. Publique `contato-verificacao` no projeto correto (`supabase functions deploy contato-verificacao --project-ref REF_DO_PROJETO`). A configuração do repositório deixa essa função acessível sem sessão de conta. As chamadas privadas ao Postgres usam o papel de serviço e o envio exige Turnstile.
3. Para ensaiar antes de abrir ao público, configure `MAPPIA_CONTACT_STATE=pilot` e `MAPPIA_PILOT_CONTACTS` com o e-mail e o número brasileiro em formato internacional autorizados, separados por vírgulas. Use a chave pública e a URL do Supabase de produção e a chave pública Turnstile em `js/config.js` para o ensaio. Em SQL, confirme `modo_apresentacao=false` e habilite `recebimento_real_ativo` somente no projeto preparado. Mantenha o site público fechado durante esse ensaio.
4. Receba **um e-mail e um SMS** em contatos da equipe. Em cada canal, confira que um código inválido falha e que o código recebido permite enviar sem criar conta. Finalize um relato com foto e outro sem foto. No painel, valide um deles. Confira que a consulta e o mapa resumem o estado e que só a equipe vê referência, contato, foto e posição exata. Teste o cadastro por link de e-mail e a entrada por SMS separadamente.
5. Confirme quem opera a moderação, o canal de contato sobre dados pessoais e os prazos de descarte de tentativas, relatos e fotos. Registre essa informação no aviso apresentado antes do envio.
6. Com os testes aprovados, confirme que o mapa e o contador iniciam sem relatos de ensaio. Remova apenas os registros usados na validação, com seleção por protocolo e autorização do responsável. Remova seus arquivos pelo Storage. Configure `MAPPIA_CONTACT_STATE=public`, troque a URL e a chave pública no site e habilite `CONTAS_ATIVAS` e `TELEFONE_ATIVO` conforme os testes do Auth.

## Fechar o recebimento

No projeto de produção, altere `public.configuracao.recebimento_real_ativo` para `false` e retire o estado `public` da Edge Function. Relatos reais já gravados continuam consultáveis. O reset de apresentação tem uso exclusivo no banco de demonstração.

## Testes locais

```text
npm ci
npm test
node --test supabase/functions/contato-verificacao/handler.test.mjs
```

Os testes de provedor simulam a rede. A abertura exige a entrega confirmada nos dois destinos autorizados.
