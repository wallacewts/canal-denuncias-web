# AGENTS.md

Front-end do Canal de Denúncias de Vazamento de Dados: workspace Angular 22 com `projects/portal` (denunciante
anônimo), `projects/backoffice` (equipe interna) e `projects/shared` (importado como `@canal/shared`). Leia o
README.md antes de mudar algo. A versão do Angular é provavelmente mais nova do que você conhece: confira o que o CLI
gera em vez de assumir APIs antigas (zoneless e componentes standalone são o padrão; testes rodam no Vitest).

## Regras que não podem ser quebradas

- Nenhuma telemetria, analytics, CDN, fonte ou script externo. Fontes e ícones entram por pacote npm e vão no bundle.
  Não ative o analytics do Angular CLI (`cli.analytics` fica `false` em angular.json).
- Nada de `localStorage`, `sessionStorage`, IndexedDB ou `document.cookie`. A sessão é cookie `HttpOnly` da API.
- Protocolo, chave e dados do relato nunca vão na URL (nem em parâmetro de rota, nem em query string).
- O portal não registra acesso: o nginx do portal fica com `access_log off`.
- A CSP é estrita (nonce por requisição + Trusted Types). Não use `innerHTML` com string crua, `bypassSecurityTrust*`,
  `eval` ou estilos/scripts inline sem nonce. Não afrouxe a CSP em `docker/nginx/security-headers.inc.template` sem
  registrar uma decisão.
- Chamadas à API usam o prefixo `api:` (`http.get('api:/public/v1/...')`), tratado por `apiInterceptor`. Prefira o cliente
  gerado (`@canal/shared/api/public` e `/admin`). Nunca edite `projects/shared/src/lib/api/generated/`: atualize com
  `npm run api:sync` (copia os contratos da API) e `npm run api:generate`. O CI roda `npm run api:check`.
- O portal nunca importa `@canal/shared/api/admin` (o lint reprova).
- Nada de `console.*` no código dos apps e da lib (regra `no-console`). Erros são tratados pelo `errorInterceptor` e pelo
  `AppErrorHandler`.
- O token do denunciante fica só em `ReporterSession` (memória). Estado sensível de tela usa `ScreenState<T>` fornecido no
  componente de rota.
- O proxy `/api` do portal remove IP e cookies; não mude isso sem registrar decisão.
- Testes de ponta a ponta: `npm run e2e` (Playwright no container oficial). Todo teste usa a fixture `privacyGuards` de
  `e2e/fixtures/privacy-guards.ts`. Nunca use `bypassCSP`. Por enquanto só no Chromium (`E2E_BROWSERS`, padrão
  `chromium`; o Firefox está desativado temporariamente, ver `docs/validacoes/navegadores-e2e.md`).
- O servidor simulado da API fica em `tools/mock-api` (e2e e `npm run dev:mock-api`). Os apps nunca importam `tools/` nem
  `e2e/` (o lint reprova), e o `check:build` reprova sentinelas do simulador (`DV-SIMUL`, `SIMULADA`, `__mock`) no build.
- O envio de denúncia usa tipos provisórios (`report-submission.types.ts`) até CAT-01 e REP-02 saírem no contrato da API;
  a troca pelo cliente gerado é a T048 da feature 002. O acompanhamento usa a mesma exceção provisória em
  `features/tracking/tracking.types.ts` (até PUB-01, PUB-03, MSG-01 e MSG-02; remoção na T037 da feature 003). O acesso
  da equipe usa `projects/backoffice/src/app/features/auth/auth.types.ts` (até AUTH-01 a AUTH-05 e USERS-07; remoção na
  T046 da feature 004). Não crie outros tipos de resposta da API escritos à mão.
- O bundle inicial do portal tem aviso em 440 kB (D52). Código de tela novo vai em rota com `loadComponent`.
- Em código carregado sob demanda, nunca importe do barril `@canal/shared` um símbolo que já está no bundle inicial
  (interceptors, políticas, tokens de HTTP): o build levaria a lib inteira para o bundle inicial (+100 kB na feature
  003). Use a entrada secundária (`@canal/shared/http` para `API_CALLER_HANDLES`). O `check:build` falha se o barril
  aparecer no bundle inicial; por isso o `npm run build` usa `--stats-json`.
- O acesso do denunciante só é encerrado pelo `ReporterAccess` (`features/tracking/reporter-access.ts`): expirar, 401,
  "Sair" e `pageshow` passam por ele. Respostas que chegam depois do encerramento são descartadas (`isCurrent`). A
  mensagem do encerramento aparece só na tela de consulta (`endReason`), nunca como snackbar.
- Status que a tela trata sozinha vão em `API_CALLER_HANDLES` (o `errorInterceptor` não mostra mensagem nem roda o
  401 para eles). No portal, o 401 é silencioso (`silentUnauthenticated`): o `ReporterAccess` avisa a pessoa.
- O simulador tem cenários de acompanhamento (`access`, `me`, `report`, `messages`, `send`) e `newTeamMessage()`
  (`e2e/support/mock-api.ts`). Ids de mensagem são estáveis entre leituras.
- A sessão da equipe só é encerrada pelo `StaffSession` (`features/auth/staff-session.ts`): inatividade, limite de 8
  horas, 401, "Sair" e saída em outra aba passam pelo `end()`. Horários de expiração vêm da API (nunca um prazo escrito
  no front); a correção de relógio usa o `Date` da API, que o nginx do backoffice repassa. Menu e rotas usam só as
  permissões (`abilities`) do `/me`. No backoffice, 403 `PASSWORD_CHANGE_REQUIRED` leva à troca de senha e 403
  `STEP_NOT_ALLOWED` à etapa certa (`onForbidden` da política), sem a mensagem de acesso negado.
- Proteção contra falsificação de requisição: a da API por origem (AUTH-07), sem token XSRF. O proxy do backoffice
  repassa o `Host` original com a porta.
- Arquivo de texto baixado no navegador: `downloadTextFile` de `@canal/shared/files`.
- O simulador tem contas da equipe (`STAFF` em `e2e/support/mock-api.ts`), cenários `signIn` e `challenge`, relógio
  (`advanceClock`) e revogação de sessões. Recarregar no e2e: `reloadWhenSettled` (`e2e/support/reload.ts`).
- Textos de interface em português; nomes de código em inglês.

## Princípios

A constituição do projeto, em `.specify/memory/constitution.md`, prevalece sobre qualquer outra orientação. Todo plano do Spec Kit precisa passar pela checagem dela.
