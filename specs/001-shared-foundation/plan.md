# Implementation Plan: Base transversal do front (lib compartilhada)

**Branch**: `main` (sem branch de feature, decisão do usuário) | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-shared-foundation/spec.md`

## Summary

Construir na lib `@canal/shared` a base que todas as telas dos dois apps vão herdar, cobrindo as tarefas FTRV-01 a
FTRV-11 (FTRV-08 fica fora do escopo):

- cliente da API gerado do contrato OpenAPI, separado em `public` e `admin`;
- tratamento único de erros, com mensagens em português;
- credenciais separadas por app: o portal não envia cookies e só envia o token do denunciante em `/public/v1/me/*`;
- proxy `/api` no nginx de cada app, para o XSRF funcionar no ambiente local como em produção;
- tema e componentes base acessíveis;
- padrão de estado com signals nativos;
- regras de lint e de build que protegem os dados no cliente;
- estrutura de testes e2e com Playwright em container, com guardas de privacidade, de CSP e de acessibilidade.

As decisões técnicas estão em [research.md](./research.md). Os principais pontos:

- `ng-openapi-gen` 1.1.0 no lugar do `orval`;
- serviços com signals no lugar do `@ngrx/signals`;
- Playwright 1.65.1 rodando na imagem oficial `mcr.microsoft.com/playwright:v1.65.1-noble`.

## Technical Context

**Language/Version**: TypeScript 6.0, Angular 22.3 (standalone, zoneless, signals), Node.js 26 para build e scripts.

**Primary Dependencies**:

- Já existentes: Angular Material/CDK 22.3, `@fontsource/roboto` e `material-symbols` (assets no bundle).
- Novas, só para desenvolvimento: `ng-openapi-gen` 1.1.0, `@playwright/test` 1.65.1 e `@axe-core/playwright` 4.14.1.
- Nenhuma dependência nova de runtime.

**Storage**: N/A. Nada é persistido no navegador. Estado só em memória.

**Testing**: Vitest (unitários, via `@angular/build:unit-test` com jsdom); Playwright em container (e2e, Chromium e
Firefox); axe-core (acessibilidade); ESLint (regras de privacidade).

**Target Platform**: navegadores atuais (Chrome, Firefox, Edge, Safari). Apps servidos por `nginx-unprivileged` com CSP
estrita (nonce + Trusted Types).

**Project Type**: aplicação web, workspace Angular com 2 apps (`portal`, `backoffice`) e 1 lib (`shared`).

**Performance Goals**: bundle inicial do portal com no máximo 400 kB de aviso e 500 kB de erro (hoje ~347 kB). Nenhuma
requisição extra no carregamento além de `config.json` e dos assets do próprio app.

**Constraints**: nenhuma requisição externa; CSP sem `unsafe-*`; nada em storage, URL ou console; WCAG 2.1 AA no portal;
máquinas de desenvolvimento em Ubuntu 20.04, onde o Playwright não roda nativamente.

**Scale/Scope**: 11 tarefas do backlog (FTRV-08 fora do escopo), cerca de 10 artefatos novos na lib, ajustes em 2 apps,
nginx, compose e CI.

**Dependências do backend**: TRV-01 (formato de erro), TRV-07 (rotas), TRV-08 (paginação), TRV-11 (contratos
`openapi/public.json` e `openapi/admin.json`, gravados por `npm run openapi:export`), AUTH-07 (CSRF/CORS), PUB-02 (token do denunciante). Até o export existir, as tarefas
de geração do cliente ficam bloqueadas, e o restante usa respostas simuladas nos testes unitários.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Confira cada portão contra `.specify/memory/constitution.md`. Marque ✅ ou explique a violação em "Complexity Tracking".

- [x] **I. Anonimato** ✅: nenhuma requisição externa. A geração do cliente roda offline e os e2e reprovam qualquer
      origem diferente da do app. O proxy do portal remove `X-Forwarded-For`, `X-Real-IP` e `Forwarded` e mantém
      `access_log off`. O token do denunciante fica só em `signal` e vai apenas para `/public/v1/me/*`. O portal não
      envia cookies. Lint e e2e garantem storage vazio, nada na URL e nada no console.
- [x] **II. Navegador** ✅: a CSP fica intacta, e passa a ser mais restrita, com `connect-src 'self'` fixo. Nonce e Trusted
      Types não mudam. A sessão do backoffice continua em cookie HttpOnly, com XSRF funcionando no ambiente local pelo
      proxy no mesmo endereço. Os e2e rodam sem `bypassCSP`.
- [x] **III. Fronteira** ✅: o tratamento de 401 e 403 só muda navegação e mensagem. Nenhuma regra de permissão ou de
      transição é copiada da API, e os tipos vêm do contrato gerado.
- [x] **IV. Acessibilidade** ✅: componentes base com texto além de cor, foco controlável e `aria-busy`. Avisos anunciados
      aos leitores de tela. axe-core em todas as rotas do portal no e2e, mais teclado, contraste, zoom de 200% e 320 px.
- [x] **V. Padrões Angular** ✅: standalone, signals e zoneless. Cliente gerado do OpenAPI, nunca escrito à mão. O
      cliente `admin` é separado, e uma regra de lint impede o portal de importá-lo. `config.json` em tempo de execução.
- [x] **VI. Testes** ✅: teste unitário para cada status de erro e para as duas políticas de credenciais. As guardas de
      rede, URL, CSP, storage e console valem em todo e2e. Os fluxos do MVP são acrescentados pelas features de tela
      (opção A confirmada; ver spec, Clarifications, e research.md, R9).
- [x] **VII. Qualidade** ✅: lint, testes e build dos dois apps no CI. Orçamento do bundle do portal reduzido para
      400/500 kB. Build sem source maps. Job de e2e no CI. Nenhum segredo: os contratos `openapi/*.json` são públicos, e
      `API_UPSTREAM` não é segredo.
- [x] **VIII. Simplicidade** ✅: nenhuma dependência de runtime nova. `@ngrx/signals` fica de fora até haver necessidade
      real. `ng-openapi-gen` foi escolhido pela menor cadeia de dependências. Nenhuma das ferramentas novas faz
      requisição externa em uso (o Playwright baixa navegadores só na imagem do container, não no app).

**Re-check pós-design (Phase 1)**: os portões continuam aprovados. Os contratos não introduzem armazenamento, requisição
externa nem afrouxamento de CSP. A única condição em aberto é a do R3: se o axe-core conflitar com Trusted Types, ele
roda num projeto separado do Playwright, sem desligar a CSP dos demais testes. Isso não é violação.

## Project Structure

### Documentation (this feature)

```text
specs/001-shared-foundation/
├── plan.md              # Este arquivo
├── research.md          # Phase 0: decisões técnicas (R1 a R9)
├── data-model.md        # Phase 1: entidades em memória
├── quickstart.md        # Phase 1: roteiro de validação
├── contracts/           # Phase 1: contratos da lib, erros, config/proxy e guardas e2e
├── checklists/
│   └── requirements.md  # Checklist de qualidade da spec
└── tasks.md             # Phase 2 (/speckit-tasks, ainda não criado)
```

### Source Code (repository root)

```text
openapi/
├── public.json                          # contrato público exportado pela API (TRV-11)
└── admin.json                           # contrato administrativo exportado pela API (TRV-11)
scripts/
├── api-sync.mjs                         # copia openapi/public.json e admin.json da API
└── api-check.mjs                        # regera e falha se houver diferença (CI)
ng-openapi-gen.public.json               # config: openapi/public.json → generated/public
ng-openapi-gen.admin.json                # config: openapi/admin.json → generated/admin

projects/shared/src/
├── public-api.ts
├── api/
│   ├── public.ts                        # entry @canal/shared/api/public
│   └── admin.ts                         # entry @canal/shared/api/admin
└── lib/
    ├── api/generated/{public,admin}/    # código gerado (fora do lint/prettier)
    ├── config/app-config.ts             # existente
    ├── http/
    │   ├── provide-api.ts               # passa a receber ApiPolicy
    │   ├── api.interceptor.ts           # existente (prefixo api:)
    │   ├── credentials.interceptor.ts   # withCredentials e Bearer por política
    │   ├── error.interceptor.ts         # HttpErrorResponse → ApiError → aviso
    │   ├── api-error.ts                 # tipo e conversão
    │   └── error-messages.ts            # tabela de mensagens
    ├── errors/app-error-handler.ts
    ├── notifications/notification.service.ts
    ├── session/reporter-session.ts      # token do denunciante em memória
    ├── ui/                              # page-header, empty-state, loading-state,
    │                                    # confirm-dialog, status-chip, sensitive-input
    ├── pipes/                           # portal-date, staff-date-time
    └── theme/_theme.scss                # tema Material 3 compartilhado

projects/portal/src/
├── main.ts                              # sem console.error
└── app/app.config.ts                    # provideApi(config, PORTAL_POLICY)
projects/backoffice/src/
├── main.ts                              # sem console.error
└── app/app.config.ts                    # provideApi(config, BACKOFFICE_POLICY)

docker/
├── nginx/portal.conf.template           # + location /api/ sem IP, sem log
├── nginx/backoffice.conf.template       # + location /api/ com IP real
├── nginx/security-headers.inc.template  # connect-src 'self'
└── config/{portal,backoffice}.json      # apiBaseUrl "/api"
docker-compose.yml                       # API_UPSTREAM, extra_hosts host-gateway
docker-compose.e2e.yml                   # serviço e2e com a imagem do Playwright

e2e/
├── playwright.config.ts                 # projetos chromium, firefox (e a11y, se preciso)
├── fixtures/privacy-guards.ts           # rede, URL, CSP, storage e console
├── portal/routes.spec.ts                # todas as rotas do portal + axe
└── backoffice/routes.spec.ts            # todas as rotas do backoffice

eslint.config.js                         # no-console; portal não importa api/admin; ignora generated
angular.json                             # budgets 400/500 kB no portal; sourceMap false
tsconfig.json                            # paths @canal/shared/api/public e /admin
.github/workflows/ci.yml                 # api:check e job de e2e
```

**Structure Decision**: mantém o workspace atual (2 apps + lib). Todo o código transversal fica em
`projects/shared`. Os clientes gerados ficam dentro da lib, expostos por dois entry points (`api/public` e `api/admin`)
para que a fronteira portal × backoffice seja verificável por lint. Os e2e ficam na raiz (`e2e/`) porque testam os dois
apps já empacotados nas imagens nginx.

## Fases de entrega

| Fase | Entrega                                                                         | Bloqueio                                |
| ---- | ------------------------------------------------------------------------------- | --------------------------------------- |
| A    | FTRV-02, 03, 09, 10, 11 (lib, interceptors, sessão, componentes, lint, budgets) | nenhum (testes com respostas simuladas) |
| B    | FTRV-04 (proxy `/api`, `connect-src 'self'`, XSRF no compose)                   | AUTH-07 para o teste do XSRF            |
| C    | FTRV-01 (sync, geração, check no CI)                                            | TRV-11 (`npm run openapi:export`)       |
| D    | FTRV-05, 06, 07 (estrutura e2e, guardas, axe, rotas existentes)                 | Fase B                                  |

Os fluxos completos do MVP nos e2e e a validação final de CSP e acessibilidade em todas as telas reais fecham na etapa 7
do backlog (opção A, confirmada pelo usuário em 2026-11-27).

## Complexity Tracking

| Violation                                                                                                                          | Why Needed                                                                                                                                                                                                                                                                                 | Simpler Alternative Rejected Because                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tipo interno `ProvisionalApiError` escrito à mão para o corpo de erro da API (princípio V: formatos da API não são escritos à mão) | O tratamento de erros (US2) precisa ler `statusCode` e `requestId` antes de a API exportar os contratos (TRV-11). O tipo é interno à lib, marcado como provisório no código, validado em tempo de execução e removido pela T070 assim que o modelo gerado de `openapi/public.json` existir | Esperar o TRV-11 travaria a US2 inteira (uma das duas histórias P1). Usar `unknown` sem tipo nenhum espalharia checagens pelo código e tornaria o interceptor mais frágil |
