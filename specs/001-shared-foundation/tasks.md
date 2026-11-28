---
description: 'Lista de tarefas da base transversal do front (001-shared-foundation)'
---

# Tasks: Base transversal do front (lib compartilhada)

**Input**: Design documents from `/specs/001-shared-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are MANDATORY for every privacy, security, permission, encryption or audit rule (constitution, principle
VI). Nesta feature isso cobre credenciais, sessão do denunciante, erros, console, armazenamento, rede, CSP, proxy e
acessibilidade. Os testes de cada história vêm **antes** da implementação e precisam falhar primeiro. A spec também pede
testes explícitos para cada status de erro (FR-009), para as duas políticas de credenciais (FR-012) e para os
componentes base (FR-030).

**Organization**: tarefas agrupadas por user story, para que cada uma possa ser implementada e testada sozinha.

**Bloqueios do backend**: tarefas marcadas com ⛔ só podem ser concluídas quando a tarefa do backend indicada estiver
pronta. Até lá, ficam em aberto e não impedem as outras.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: user story da spec (US1 a US5)
- Caminhos relativos à raiz do repositório `canal-denuncias-web`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependências de desenvolvimento, caminhos de import e exclusões de lint para o código gerado.

- [x] T001 Adicionar como devDependencies, com versão exata, `ng-openapi-gen@1.1.0`, `@playwright/test@1.65.1` e `@axe-core/playwright@4.14.1` em `package.json` e regenerar `package-lock.json` com o npm da imagem `node:26-alpine` (mesmo procedimento do esqueleto)
- [x] T002 [P] Criar os entry points vazios `projects/shared/src/api/public.ts` e `projects/shared/src/api/admin.ts` (com `export {};` e comentário apontando para `lib/api/generated/`) e mapear `@canal/shared/api/public` e `@canal/shared/api/admin` em `paths` no `tsconfig.json`
- [x] T003 [P] Excluir `projects/shared/src/lib/api/generated/` do lint (bloco `ignores` em `eslint.config.js`) e da formatação (`.prettierignore`), e ignorar `e2e/report/` e `e2e/test-results/` no `.gitignore`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: política de credenciais na assinatura do `provideApi` (os dois apps dependem dela para compilar) e a
estrutura de e2e com as guardas de privacidade, usada pelos testes de US1, US3, US4 e US5.

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase.

- [x] T004 Criar o tipo `ApiPolicy` (`withCredentials`, `bearerFor`, `onUnauthenticated`) em `projects/shared/src/lib/http/api-policy.ts`, conforme `data-model.md`, e exportá-lo em `projects/shared/src/public-api.ts`
- [x] T005 Alterar `provideApi(config)` para `provideApi(config, policy)` em `projects/shared/src/lib/http/provide-api.ts`, registrando a política num `InjectionToken` `API_POLICY`, sem mudar ainda o comportamento dos interceptors
- [x] T006 [P] Definir `PORTAL_API_POLICY` (`withCredentials: false`, `bearerFor: '/public/v1/me/'`) em `projects/portal/src/app/api-policy.ts` e passá-la em `projects/portal/src/app/app.config.ts`
- [x] T007 [P] Definir `BACKOFFICE_API_POLICY` (`withCredentials: true`, `bearerFor: null`) em `projects/backoffice/src/app/api-policy.ts` e passá-la em `projects/backoffice/src/app/app.config.ts`
- [x] T008 Criar `e2e/playwright.config.ts` com os projetos `chromium` e `firefox`, `baseURL` por projeto de app (`http://portal:8080`, `http://backoffice:8080`), sem `bypassCSP`, relatório em `e2e/report/`
- [x] T009 Criar o serviço `e2e-api` (servidor de eco em Node que devolve método, caminho, cabeçalhos e cookies recebidos, e emite um cookie `XSRF-TOKEN` de teste) em `e2e/support/echo-api.mjs`, para os testes do proxy não dependerem da API real
- [x] T010 Criar `docker-compose.e2e.yml` com o serviço `e2e` (imagem `mcr.microsoft.com/playwright:v1.65.1-noble`, monta o repositório, roda `npx playwright test -c e2e/playwright.config.ts`) e o serviço `e2e-api` (`node:26-alpine` rodando `e2e/support/echo-api.mjs`), com `APP_API_UPSTREAM` dos apps apontando para `http://e2e-api:3000` neste override
- [x] T011 Criar a fixture `privacyGuards` em `e2e/fixtures/privacy-guards.ts` com as cinco guardas de `contracts/e2e-privacy-guards.md`: rede fora da origem, valor sensível na URL (`trackSensitive`), evento `securitypolicyviolation` registrado via `addInitScript` e mensagens de CSP/Trusted Types no console, armazenamento não vazio ao fim (`localStorage`, `sessionStorage`, `indexedDB.databases()`), e `console.error` do app
- [x] T012 Criar testes da própria fixture em `e2e/fixtures/privacy-guards.spec.ts`, provando que cada guarda reprova (página de teste servida pelo `e2e-api` que faz requisição externa, grava no `localStorage`, coloca valor na URL e viola a CSP)
- [x] T013 Adicionar o script `e2e` em `package.json` (`docker compose -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from e2e`) e o job `e2e` em `.github/workflows/ci.yml`, publicando `e2e/report/` como artefato

**Checkpoint**: os apps compilam com a política, e `npm run e2e` roda a suíte da própria fixture.

---

## Phase 3: User Story 1 - Denunciante usa o portal sem deixar rastros (Priority: P1) 🎯 MVP

**Goal**: o portal não envia cookies, guarda a credencial do denunciante só em memória, manda o Bearer só em
`/public/v1/me/*` e não deixa nada na URL, no armazenamento, no console ou em requisição externa (FTRV-03, FTRV-05,
FTRV-11).

**Independent Test**: `npm test` (interceptor e sessão), `node scripts/check-lint-rules.mjs` e `npm run e2e` nas rotas
do portal, com as guardas de privacidade ativas em Chromium e Firefox.

### Tests for User Story 1 (mandatory for security and privacy rules) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T014 [P] [US1] Testes do interceptor de credenciais em `projects/shared/src/lib/http/credentials.interceptor.spec.ts`: com `PORTAL_API_POLICY`, nenhuma chamada sai com `withCredentials`; o `Authorization: Bearer` vai só em `api:/public/v1/me/...` e nunca em outras rotas; sem token, nada é anexado; com `BACKOFFICE_API_POLICY`, toda chamada `api:` sai com `withCredentials` e sem `Authorization`
- [x] T015 [P] [US1] Testes de `ReporterSession` em `projects/shared/src/lib/session/reporter-session.spec.ts`: `start` guarda o token só em memória, `clear` zera token e expiração, nada é escrito em `localStorage`, `sessionStorage` ou `document.cookie` (espiões)
- [x] T016 [P] [US1] Teste das regras de lint em `scripts/check-lint-rules.mjs` (API do ESLint sobre trechos de código): reprova `console.log` em `projects/portal/src`, `localStorage`, `sessionStorage`, `document.cookie` e import de `@canal/shared/api/admin` dentro do portal; aceita `console` em arquivos `*.spec.ts`
- [x] T017 [P] [US1] E2E de privacidade do portal em `e2e/portal/routes.spec.ts`: visita todas as rotas de `projects/portal/src/app/app.routes.ts` com `privacyGuards`, abre um diálogo, um aviso e um menu do Material e confere zero violações de CSP e armazenamento vazio
- [x] T018 [P] [US1] E2E de privacidade do backoffice em `e2e/backoffice/routes.spec.ts`: mesmas guardas em todas as rotas de `projects/backoffice/src/app/app.routes.ts`
- [x] T019 [P] [US1] Teste do build de produção em `scripts/check-build-output.mjs`: falha se `dist/portal` ou `dist/backoffice` contiver arquivos `.map` ou referência a domínio externo (`https?://` fora de `localhost` e comentários de licença)

### Implementation for User Story 1

- [x] T020 [US1] Implementar `ReporterSession` (signal somente leitura `token`, `expiresAt`, `start`, `clear`) em `projects/shared/src/lib/session/reporter-session.ts` e exportar em `projects/shared/src/public-api.ts`
- [x] T021 [US1] Implementar `credentialsInterceptor` em `projects/shared/src/lib/http/credentials.interceptor.ts`, lendo `API_POLICY` e `ReporterSession`, e registrá-lo em `projects/shared/src/lib/http/provide-api.ts`; remover o `withCredentials: true` fixo de `projects/shared/src/lib/http/api.interceptor.ts` e ajustar `api.interceptor.spec.ts`
- [x] T022 [US1] Adicionar em `eslint.config.js` a regra `no-console: error` para `projects/*/src/**/*.ts` (exceto `*.spec.ts`) e `no-restricted-imports` para `@canal/shared/api/admin` em `projects/portal/**`
- [x] T023 [P] [US1] Remover o `console.error` de `projects/portal/src/main.ts` e de `projects/backoffice/src/main.ts`, mantendo só a mensagem de indisponibilidade na página
- [x] T024 [P] [US1] Definir `sourceMap: false` explícito na configuração `production` dos dois apps e reduzir o orçamento `initial` do portal para `400kB` de aviso e `500kB` de erro em `angular.json`
- [x] T025 [P] [US1] Criar a diretiva `SensitiveInput` (`appSensitiveInput`: aplica `autocomplete="off"` e `spellcheck="false"`) em `projects/shared/src/lib/ui/sensitive-input.directive.ts`, com teste em `sensitive-input.directive.spec.ts`, e exportá-la em `projects/shared/src/public-api.ts`
- [x] T026 [US1] Incluir `node scripts/check-lint-rules.mjs` e, depois do build, `node scripts/check-build-output.mjs` como passos do job `quality` em `.github/workflows/ci.yml`
- [ ] T027 [US1] Fazer a validação manual de CSP de FTRV-05 (janelas anônimas do Chrome e do Firefox, com diálogo, aviso, menu, tooltip, datepicker e select) e registrar o resultado, com data e versões dos navegadores, em `docs/validacoes/csp.md`
  - **Parcial (2026-11-27):** a validação automática em Chromium 159 e Firefox 159 (e2e, 46 testes de rota) está
    registrada em `docs/validacoes/csp.md`. Faltam a conferência manual da equipe e os componentes que injetam estilo,
    que ainda não aparecem em nenhuma rota.

**Checkpoint**: US1 completa e testável sozinha. O portal não envia cookies, e as guardas de privacidade passam em
todas as rotas existentes.

---

## Phase 4: User Story 2 - Mensagens de erro claras e sessão expirada tratada (Priority: P1)

**Goal**: um único tratamento de erros, com a tabela de `contracts/error-messages.md`, avisos anunciados aos leitores de
tela, 401 levando ao lugar certo e nada no console (FTRV-02).

**Independent Test**: `npm test`, com respostas de erro simuladas pelo `HttpTestingController` para cada status da
tabela.

### Tests for User Story 2 (mandatory for security and privacy rules) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T028 [P] [US2] Testes de `toApiError` em `projects/shared/src/lib/http/api-error.spec.ts`: corpo padrão (`statusCode`, `error`, `message`, `requestId`), resposta sem corpo, corpo fora do formato e falha de rede (status 0)
- [x] T029 [P] [US2] Testes do `errorInterceptor` em `projects/shared/src/lib/http/error.interceptor.spec.ts`: uma asserção por linha de `contracts/error-messages.md` (0, 400, 401, 403, 404, 409, 410, 429, 5xx), sufixo "Código para o suporte: …" só quando há `requestId`, o `message` da API nunca exibido, `onUnauthenticated` chamado no 401 e nenhum `console.*` chamado (espiões)
- [x] T030 [P] [US2] Testes de `NotificationService` em `projects/shared/src/lib/notifications/notification.service.spec.ts`: erro com `politeness: 'assertive'`, sucesso com `'polite'`, texto anunciado pelo `LiveAnnouncer`
- [x] T031 [P] [US2] Testes de `AppErrorHandler` em `projects/shared/src/lib/errors/app-error-handler.spec.ts`: um erro não tratado não chama `console.*` com o objeto de erro nem com corpo HTTP
- [x] T032 [P] [US2] Testes das ações de 401 por app: em `projects/portal/src/app/api-policy.spec.ts`, limpa `ReporterSession` e navega para `/consultar`, sem protocolo ou chave na URL; em `projects/backoffice/src/app/api-policy.spec.ts`, navega para `/login`

### Implementation for User Story 2

- [x] T033 [P] [US2] Implementar `toApiError(unknown)` com validação em tempo de execução e o tipo interno `ProvisionalApiError` (comentário `// PROVISÓRIO: trocar pelo modelo gerado de openapi/public.json (TRV-11)`) em `projects/shared/src/lib/http/api-error.ts`, conforme `data-model.md`
- [x] T034 [P] [US2] Implementar a tabela de mensagens em `projects/shared/src/lib/http/error-messages.ts`, com os textos exatos de `contracts/error-messages.md`
- [x] T035 [P] [US2] Implementar `NotificationService` (snackbar do Material e `LiveAnnouncer` do CDK) em `projects/shared/src/lib/notifications/notification.service.ts`
- [x] T036 [US2] Implementar `errorInterceptor` em `projects/shared/src/lib/http/error.interceptor.ts` e registrá-lo em `projects/shared/src/lib/http/provide-api.ts`, depois do interceptor de credenciais. Espera a T021, porque as duas alteram `provide-api.ts`
- [x] T037 [US2] Implementar `AppErrorHandler` e `provideAppErrorHandler()` em `projects/shared/src/lib/errors/app-error-handler.ts` e usá-lo em `projects/portal/src/app/app.config.ts` e `projects/backoffice/src/app/app.config.ts`
- [x] T038 [US2] Implementar `onUnauthenticated` nas políticas: limpar `ReporterSession` e navegar para `/consultar` em `projects/portal/src/app/api-policy.ts`; navegar para `/login` em `projects/backoffice/src/app/api-policy.ts`
- [x] T039 [US2] Exportar `ProvisionalApiError`, `toApiError`, `NotificationService` e `provideAppErrorHandler` em `projects/shared/src/public-api.ts`

**Checkpoint**: US1 e US2 funcionam juntas, com o mesmo tratamento de erro nos dois apps.

---

## Phase 5: User Story 3 - Interface acessível e consistente (Priority: P2)

**Goal**: tema único, componentes base e datas em português, com o portal acessível (FTRV-07, FTRV-09).

**Independent Test**: `npm test` (componentes e pipes) e `npm run e2e` com o axe nas rotas do portal, mais navegação
por teclado e largura de 320 px.

### Tests for User Story 3 (mandatory for security and privacy rules) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T040 [P] [US3] Testes de `PageHeader` em `projects/shared/src/lib/ui/page-header.spec.ts`: renderiza `h1`, `focus()` move o foco para o título
- [x] T041 [P] [US3] Testes de `EmptyState` e `LoadingState` em `projects/shared/src/lib/ui/empty-state.spec.ts` e `loading-state.spec.ts`: texto visível; `aria-busy="true"` e rótulo para leitor de tela no carregamento
- [x] T042 [P] [US3] Testes de `ConfirmDialog` em `projects/shared/src/lib/ui/confirm-dialog.spec.ts`: `open()` resolve `true` ao confirmar e `false` ao cancelar ou fechar com Esc, e `window.confirm` nunca é chamado
- [x] T043 [P] [US3] Testes de `StatusChip` em `projects/shared/src/lib/ui/status-chip.spec.ts`: o texto está sempre presente em todos os `tone`
- [x] T044 [P] [US3] Testes dos pipes em `projects/shared/src/lib/pipes/portal-date.pipe.spec.ts` e `staff-date-time.pipe.spec.ts`: `dd/MM/yyyy` sem hora no portal e `dd/MM/yyyy HH:mm:ss` no backoffice, em `pt-BR`
- [x] T045 [P] [US3] E2E de acessibilidade em `e2e/portal/a11y.spec.ts`: axe sem violação `serious` ou `critical` em todas as rotas do portal, uso só com teclado com foco visível, `lang="pt-BR"` e nenhuma rolagem horizontal em 320 px e em viewport equivalente a zoom de 200%; e, em `e2e/backoffice/layout.spec.ts`, as mesmas verificações de 320 px e zoom de 200% em todas as rotas do backoffice (FR-025). Se o axe conflitar com Trusted Types, criar o projeto `a11y` separado em `e2e/playwright.config.ts` (research.md, R3)
- [x] T046 [P] [US3] Testes do padrão de erro de formulário em `projects/shared/src/lib/ui/form-field-error.spec.ts`: a mensagem de erro fica ligada ao campo por `aria-describedby`, é anunciada por região `aria-live="polite"` ao aparecer, e o vínculo é removido quando o campo é corrigido

### Implementation for User Story 3

- [x] T047 [US3] Criar o tema Material 3 compartilhado em `projects/shared/src/lib/theme/_theme.scss`, com tokens próprios e contraste de 4,5:1, e usá-lo em `projects/portal/src/styles.scss` e `projects/backoffice/src/styles.scss`
- [x] T048 [US3] Registrar o locale `pt-BR` (`registerLocaleData` e `LOCALE_ID`) num `provideLocale()` em `projects/shared/src/lib/i18n/provide-locale.ts` e usá-lo nos dois `app.config.ts`
- [x] T049 [P] [US3] Implementar `PageHeader` em `projects/shared/src/lib/ui/page-header.ts`
- [x] T050 [P] [US3] Implementar `EmptyState` e `LoadingState` em `projects/shared/src/lib/ui/empty-state.ts` e `projects/shared/src/lib/ui/loading-state.ts`
- [x] T051 [P] [US3] Implementar `ConfirmDialog` (sobre `MatDialog`) em `projects/shared/src/lib/ui/confirm-dialog.ts`
- [x] T052 [P] [US3] Implementar `StatusChip` em `projects/shared/src/lib/ui/status-chip.ts`, sem `[style]` com string crua
- [x] T053 [P] [US3] Implementar os pipes `portalDate` e `staffDateTime` em `projects/shared/src/lib/pipes/portal-date.pipe.ts` e `projects/shared/src/lib/pipes/staff-date-time.pipe.ts`
- [x] T054 [P] [US3] Implementar o padrão de erro de formulário acessível (componente `FormFieldError` e diretiva que liga o campo à mensagem por `aria-describedby`, com região `aria-live`) em `projects/shared/src/lib/ui/form-field-error.ts` e exportá-lo em `projects/shared/src/public-api.ts`
- [x] T055 [US3] Exportar os componentes, os pipes, `provideLocale` e o tema em `projects/shared/src/public-api.ts` e documentar o uso em `projects/shared/README.md`

**Checkpoint**: componentes base disponíveis e portal sem violações de acessibilidade nas rotas existentes.

---

## Phase 6: User Story 4 - Ambiente local igual ao de produção para a equipe (Priority: P2)

**Goal**: o proxy `/api` no nginx de cada app, `connect-src 'self'` e o XSRF funcionando no compose (FTRV-04).

**Independent Test**: `npm run e2e` com o `e2e-api` de eco: o portal chega sem IP e sem cookies, e o backoffice chega
com o IP repassado.

### Tests for User Story 4 (mandatory for security and privacy rules) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T056 [P] [US4] E2E do proxy do portal em `e2e/portal/proxy.spec.ts`: uma chamada a `/api/public/v1/eco` pelo portal chega ao `e2e-api` sem `X-Forwarded-For`, `X-Real-IP`, `Forwarded` e `Cookie`; a CSP da página traz `connect-src 'self'`
- [ ] T057 [P] [US4] E2E do proxy do backoffice em `e2e/backoffice/proxy.spec.ts`: a chamada chega com `X-Forwarded-For` preenchido e com o cookie emitido pelo `e2e-api`
- [ ] T058 [US4] ⛔ Bloqueada: AUTH-07 e a primeira ação administrativa do backoffice (BAUTH-01). E2E em `e2e/backoffice/xsrf.spec.ts`: um `POST` administrativo feito pela interface leva o cabeçalho `X-XSRF-TOKEN` igual ao cookie `XSRF-TOKEN` e é aceito pela API

### Implementation for User Story 4

- [ ] T059 [P] [US4] Adicionar `location /api/` em `docker/nginx/portal.conf.template`, com `proxy_pass ${APP_API_UPSTREAM}`, `proxy_set_header` vazio para `X-Forwarded-For`, `X-Real-IP` e `Forwarded`, sem repassar `Cookie` e mantendo `access_log off`
- [ ] T060 [P] [US4] Adicionar `location /api/` em `docker/nginx/backoffice.conf.template`, com `proxy_pass ${APP_API_UPSTREAM}` e `X-Forwarded-For`, `X-Real-IP` e `X-Forwarded-Proto` repassados
- [ ] T061 [US4] Fixar `connect-src 'self'` em `docker/nginx/security-headers.inc.template`, remover `APP_CSP_CONNECT_SRC` e manter no `Dockerfile` o `NGINX_ENVSUBST_FILTER=APP_` (o `envsubst` só substitui variáveis `APP_*`, como `APP_API_UPSTREAM`), preservando `$request_id` e as variáveis do nginx
- [ ] T062 [P] [US4] Trocar `apiBaseUrl` para `"/api"` em `docker/config/portal.json`, `docker/config/backoffice.json`, `projects/portal/public/config.json` e `projects/backoffice/public/config.json`, e conferir que `proxy.conf.json` repassa `/api` para `http://localhost:3000` no `ng serve`
- [ ] T063 [US4] Em `docker-compose.yml`, trocar `APP_CSP_CONNECT_SRC` por `APP_API_UPSTREAM: http://host.docker.internal:3000` nos dois serviços e adicionar `extra_hosts: ["host.docker.internal:host-gateway"]`
- [ ] T064 [US4] Atualizar a seção do ambiente local em `README.md`: proxy `/api`, `APP_API_UPSTREAM`, remoção do CORS entre domínios e o que o proxy do portal remove

**Checkpoint**: o compose local se comporta como produção. O teste do XSRF fica pendente até o AUTH-07.

---

## Phase 7: User Story 5 - Contrato com a API sempre sincronizado e regressões barradas (Priority: P2)

**Goal**: clientes gerados dos contratos `openapi/public.json` e `openapi/admin.json`, CI barrando divergência,
padrão de estado registrado e descarte de estado sensível (FTRV-01, FTRV-06, FTRV-10).

**Independent Test**: `npm run api:check` falha depois de editar um contrato sem regerar. O padrão de estado tem um
teste de descarte ao sair da rota.

### Tests for User Story 5 (mandatory for security and privacy rules) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T065 [P] [US5] Testes do `api:sync` em `scripts/api-sync.test.mjs` (`node --test`): copia os dois arquivos de um diretório de origem; falha se `public.json` ou `admin.json` faltar ou não for JSON válido; nunca acessa a rede
- [ ] T066 [P] [US5] Teste do padrão de estado com escopo de rota em `projects/shared/src/lib/state/screen-state.spec.ts`: um serviço fornecido no componente de rota é destruído e zera o estado sensível ao navegar para outra rota

### Implementation for User Story 5

- [ ] T067 [P] [US5] Implementar `scripts/api-sync.mjs` (padrão `../canal-denuncias-api/openapi/`, opção `--from <dir>` para o artefato do CI da API) e os scripts `api:sync`, `api:generate` e `api:check` em `package.json`
- [ ] T068 [P] [US5] Criar `ng-openapi-gen.public.json` (entrada `openapi/public.json`, saída `projects/shared/src/lib/api/generated/public`) e `ng-openapi-gen.admin.json` (entrada `openapi/admin.json`, saída `.../generated/admin`), ambos com `rootUrl` `api:`, sem módulo e com Observables
- [ ] T069 [US5] ⛔ Bloqueada: TRV-11 (`npm run openapi:export` na API). Rodar `npm run api:sync` e `npm run api:generate`, versionar `openapi/public.json`, `openapi/admin.json` e o código gerado, e reexportar os clientes em `projects/shared/src/api/public.ts` e `projects/shared/src/api/admin.ts`
- [ ] T070 [US5] ⛔ Bloqueada: TRV-11. Trocar `ProvisionalApiError` pelo modelo de erro gerado de `openapi/public.json` em `projects/shared/src/lib/http/api-error.ts`, remover o tipo provisório e manter verdes os testes de `api-error.spec.ts` e `error.interceptor.spec.ts`
- [ ] T071 [US5] ⛔ Bloqueada: TRV-11. Implementar `scripts/api-check.mjs` (regera sem rede e roda `git diff --exit-code` em `openapi/` e `generated/`) e adicioná-lo ao job `quality` de `.github/workflows/ci.yml`
- [ ] T072 [US5] Implementar o exemplo do padrão de estado (serviço com signals fornecido no componente de rota, com `clear()` em `ngOnDestroy`) em `projects/shared/src/lib/state/screen-state.ts` e documentar o padrão e o critério para adotar `@ngrx/signals` (research.md, R2) em `projects/shared/README.md`
- [ ] T073 [US5] Registrar as decisões técnicas desta feature (gerador `ng-openapi-gen`, estado com signals, Playwright em container, opção A do e2e) em `../canal-denuncias-api/docs/adr/README.md`, com os próximos números livres no momento da implementação (a partir de D34, porque D27 a D33 estão reservados para o backend), conferindo o arquivo antes de escrever. Só roda depois que o backend tiver registrado as decisões dele

**Checkpoint**: todas as user stories funcionando. Só as tarefas ⛔ dependem do backend.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: documentação, CI completo e validação final pelo quickstart.

- [ ] T074 [P] Atualizar `AGENTS.md` com as regras novas: `no-console`, portal sem `@canal/shared/api/admin`, `ReporterSession` só em memória, `npm run e2e` em container e `api:sync` antes de gerar o cliente
- [ ] T075 [P] Atualizar `README.md` com os scripts `api:sync`, `api:generate`, `api:check` e `e2e` e com a estrutura de `e2e/`
- [ ] T076 Marcar no `docs/tarefas/00-transversal.md` os critérios de aceite concluídos e, nos que fecham na etapa 7 (opção A), anotar o que ficou para as features de tela
- [ ] T077 Rodar o roteiro completo de `specs/001-shared-foundation/quickstart.md` (passos 1 a 6, pulando o 1 enquanto TRV-11 estiver bloqueada) e registrar o resultado em `docs/validacoes/csp.md`
- [ ] T078 Rodar `npm run lint`, `npm run format:check`, `npm test`, `npm run build` e `npm run e2e`, conferir que o bundle inicial do portal em `dist/portal/` fica abaixo de 400 kB e corrigir o que falhar

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup. Bloqueia todas as user stories.
- **US1 e US2 (P1)**: começam depois da Phase 2 e podem andar em paralelo. A T038 (US2) usa `ReporterSession` da T020
  (US1), e a T036 (US2) altera `provide-api.ts` depois da T021 (US1). Essas duas tarefas da US2 esperam as
  da US1.
- **US3, US4 e US5 (P2)**: começam depois da Phase 2 e são independentes entre si e de US1 e US2.
- **Polish (Phase 8)**: depois das histórias que forem entregues.

### Bloqueios do backend

| Tarefa | Espera                                                          |
| ------ | --------------------------------------------------------------- |
| T058   | AUTH-07 (CSRF/CORS) e a primeira ação administrativa (BAUTH-01) |
| T069   | TRV-11 (`npm run openapi:export` gravando `openapi/*.json`)     |
| T070   | TRV-11                                                          |
| T071   | TRV-11                                                          |

### Within Each User Story

- Testes primeiro, falhando. Depois os tipos, os serviços, os interceptors e a ligação nos apps.
- Cada história fecha no seu checkpoint antes da próxima em ordem de prioridade, se o trabalho for sequencial.

### Parallel Opportunities

- Setup: T002 e T003.
- Foundational: T006 e T007, depois de T004 e T005.
- US1: todos os testes T014 a T019 juntos; depois T023, T024 e T025 em paralelo.
- US2: testes T028 a T032 juntos; depois T033, T034 e T035 em paralelo.
- US3: testes T040 a T046 juntos; depois T049 a T054 em paralelo.
- US4: T056 e T057 juntos; T059, T060 e T062 em paralelo.
- US5: T065 e T066 juntos; T067 e T068 em paralelo.
- Com mais de uma pessoa: depois da Phase 2, US1, US3, US4 e US5 podem andar ao mesmo tempo, e a US2 só espera a T020
  (para a T038) e a T021 (para a T036).

---

## Parallel Example: User Story 1

```bash
# Testes de US1 juntos (todos devem falhar antes da implementação):
Task: "T014 Testes do interceptor de credenciais em projects/shared/src/lib/http/credentials.interceptor.spec.ts"
Task: "T015 Testes de ReporterSession em projects/shared/src/lib/session/reporter-session.spec.ts"
Task: "T016 Teste das regras de lint em scripts/check-lint-rules.mjs"
Task: "T017 E2E de privacidade do portal em e2e/portal/routes.spec.ts"
Task: "T018 E2E de privacidade do backoffice em e2e/backoffice/routes.spec.ts"
Task: "T019 Teste do build de produção em scripts/check-build-output.mjs"

# Depois, implementações em arquivos diferentes:
Task: "T023 Remover console.error dos main.ts"
Task: "T024 sourceMap false e orçamento do portal em angular.json"
Task: "T025 Diretiva SensitiveInput em projects/shared/src/lib/ui/sensitive-input.directive.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) e Phase 2 (Foundational).
2. Phase 3 (US1): portal sem rastros, com as guardas de privacidade em e2e.
3. **Parar e validar**: `npm test`, `node scripts/check-lint-rules.mjs`, `npm run e2e`.
4. Seguir para US2. As duas P1 juntas formam a base mínima para as telas do portal (feature 01, nova denúncia).

### Incremental Delivery

1. Setup + Foundational → base pronta.
2. US1 → privacidade garantida (MVP).
3. US2 → erros e sessão expirada.
4. US3 → componentes e acessibilidade, que as telas vão usar.
5. US4 → ambiente local igual ao de produção (o XSRF fecha quando o AUTH-07 sair).
6. US5 → contrato gerado (fecha quando o TRV-11 sair).

### Notes

- [P] = arquivos diferentes, sem dependência de tarefa incompleta.
- As tarefas ⛔ ficam abertas sem impedir as outras. A feature só é encerrada com elas concluídas ou movidas
  explicitamente para a etapa 7 do backlog.
- Os fluxos completos do MVP nos e2e não fazem parte desta lista (opção A): cada feature de tela acrescenta o seu.
- Commit ao fim de cada tarefa ou grupo lógico, com Conventional Commits.

---

## Pendências do analyze

Achados de 2026-11-27 que ficaram para o implement (não bloqueiam):

- **G2**: o aviso antes de a credencial do denunciante expirar (caso de borda da spec e `expiresAt` no data-model) não
  tem tarefa. Decidir no implement se entra aqui ou na feature 03 (acompanhamento).
- **G4**: FR-001 a FR-003, FR-015, SC-006 e SC-007 dependem das tarefas ⛔ (TRV-11 e AUTH-07). A feature só fecha com
  elas concluídas ou movidas explicitamente para a etapa 7.
- **I4**: a spec descreve a política de credenciais como parte da "Configuração do app" carregada na inicialização; o
  data-model a fixa no código (`ApiPolicy`). Alinhar o texto da spec ao data-model.
- **U1**: a página de teste do `e2e-api` usada na T012 precisa enviar um cabeçalho CSP para a guarda de violação ser
  provada.
- **A1**: o SC-008 é medido por revisão das mensagens; registrar essa revisão na T077 (roteiro do quickstart).
- **D1**: FR-008 e FR-034 tratam de "nada no console"; consolidar na próxima revisão da spec.
- **I5**: o FR-001 fala em "o contrato", no singular; agora são `openapi/public.json` e `openapi/admin.json`.
- **G5**: o FR-032 (formulários tipados) não tem tarefa porque ainda não há formulário; entra nas features de tela.
