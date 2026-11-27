# 00 · Transversal

**Objetivo:** base comum dos dois apps na lib `@canal/shared`: cliente da API, tratamento de erros, credenciais
separadas por app, tema e componentes base, acessibilidade, testes de ponta a ponta e as pendências do esqueleto
(CSP num navegador real e XSRF fora do mesmo domínio).

**Depende de (backend):** TRV-01, TRV-07, TRV-08, TRV-11, AUTH-07, PUB-02.

---

### FTRV-01 · Cliente da API gerado do OpenAPI

**Estimativa:** M · **Marco:** MVP · **Depende de:** TRV-11

Os tipos e as chamadas à API são gerados do documento OpenAPI da API, em vez de escritos à mão.

- **Telas e componentes:** `projects/shared/src/lib/api/generated/`, script `npm run api:generate`.
- **Endpoints:** documento OpenAPI exportado pela API (TRV-11).

**Critérios de aceite**

- [ ] Ferramenta escolhida e registrada (`orval` ou `ng-openapi-gen`), gerando serviços com `HttpClient` e o
      prefixo `api:` tratado pelo `apiInterceptor`.
- [ ] A geração lê um arquivo `openapi.json` versionado no repositório. Nenhuma requisição externa na geração.
- [ ] O CI falha se o código gerado estiver desatualizado em relação ao `openapi.json`.
- [ ] Nenhum DTO da API é escrito à mão nos apps.

### FTRV-02 · Tratamento de erros HTTP

**Estimativa:** M · **Marco:** MVP · **Depende de:** FTRV-01, TRV-01

Interceptor e `ErrorHandler` globais que transformam o corpo de erro da API em mensagens para a pessoa.

- **Telas e componentes:** `projects/shared/src/lib/http/error.interceptor.ts`, serviço de avisos (snackbar com
  região `aria-live`).

**Critérios de aceite**

- [ ] Lê o corpo padrão `{ statusCode, error, message, requestId }` e mostra uma mensagem em português com o
      `requestId` para suporte.
- [ ] 401 no backoffice leva ao login (BAUTH-05). 401 no acompanhamento do portal leva a `/consultar` (PACC-03).
- [ ] 403, 404, 409, 410 e 429 têm mensagens próprias. 500 mostra mensagem genérica.
- [ ] Nenhum corpo de requisição ou resposta vai para o `console`. O `ErrorHandler` não registra o objeto de erro
      HTTP inteiro.
- [ ] Testes unitários para cada código de status.

### FTRV-03 · Credenciais separadas por app

**Estimativa:** P · **Marco:** MVP · **Depende de:** AUTH-07, PUB-02

Hoje o `apiInterceptor` envia `withCredentials` em todas as chamadas, inclusive no portal. O portal não deve enviar
cookies; o backoffice deve.

- **Telas e componentes:** `api.interceptor.ts`, `provide-api.ts`, serviço `ReporterSession` do portal (PACC-03).

**Critérios de aceite**

- [ ] `provideApi()` recebe a política do app: backoffice com `withCredentials`, portal sem.
- [ ] No portal, o token do denunciante (guardado só em memória) vai em `Authorization: Bearer` apenas nas rotas
      `/public/v1/me/*`.
- [ ] Testes do interceptor para os dois casos.

### FTRV-04 · Mesmo domínio no docker compose local (XSRF)

**Estimativa:** P · **Marco:** MVP · **Depende de:** AUTH-07

Pendência do esqueleto: no compose local a API fica em `http://localhost:3000`, outro domínio, e o Angular não envia o
token XSRF. Em produção a API fica em `/api` no mesmo domínio.

- **Telas e componentes:** `docker/nginx/*.conf.template`, `docker/config/*.json`, `docker-compose.yml`.

**Critérios de aceite**

- [ ] O nginx de cada app repassa `/api` para a API (variável de ambiente com o endereço), como o proxy de produção.
- [ ] `docker/config/*.json` passa a usar `"apiBaseUrl": "/api"` e a CSP volta a `connect-src 'self'`.
- [ ] No compose, um `POST` administrativo leva o cabeçalho `X-XSRF-TOKEN` (conferido no teste e2e).
- [ ] README atualizado.

### FTRV-05 · Validar CSP e Trusted Types num navegador real

**Estimativa:** P · **Marco:** MVP · **Depende de:** FTRV-09

Pendência do esqueleto: os cabeçalhos foram conferidos com `curl`, mas a página nunca foi aberta num navegador com a
CSP ativa.

**Critérios de aceite**

- [ ] Com os containers do compose, Chrome e Firefox sem extensões (janela anônima) navegam por todas as rotas dos dois
      apps sem nenhuma violação de CSP ou Trusted Types no console.
- [ ] Inclui os componentes Material que injetam estilo ou DOM: dialog, snackbar, menu, tooltip, datepicker, select.
- [ ] Se algum estilo for bloqueado, a correção é registrada como decisão antes de afrouxar a CSP.
- [ ] O teste e2e (FTRV-06) falha se aparecer violação de CSP no console.

### FTRV-06 · Testes de ponta a ponta

**Estimativa:** M · **Marco:** MVP · **Depende de:** FTRV-04

O Playwright não roda no Ubuntu 20.04 das máquinas atuais. Os testes rodam num container com a imagem oficial do
Playwright, localmente e no CI.

- **Telas e componentes:** `e2e/`, script `npm run e2e` (sobe o compose e roda o container do Playwright).

**Critérios de aceite**

- [ ] Fluxo do MVP coberto: enviar denúncia, guardar protocolo e chave, consultar, trocar mensagem com a equipe; login
      com MFA, triagem, atribuição e conclusão.
- [ ] Todo teste registra as requisições de rede e falha se alguma for para domínio diferente do próprio app ou da API.
- [ ] Todo teste falha se a URL contiver protocolo, chave ou texto do relato.
- [ ] Job de e2e no CI (`ubuntu-latest`).

### FTRV-07 · Acessibilidade

**Estimativa:** M · **Marco:** MVP · **Depende de:** FTRV-06

O portal precisa atender WCAG 2.1 AA. O backoffice segue as mesmas regras, sem exigência formal.

**Critérios de aceite**

- [ ] `axe-core` roda no e2e em todas as rotas do portal, sem violação séria ou crítica.
- [ ] Todo o portal funciona só com teclado, com foco visível. Ao trocar de etapa no wizard, o foco vai para o título
      da etapa.
- [ ] Erros de formulário anunciados por região `aria-live` e ligados ao campo (`aria-describedby`).
- [ ] Contraste mínimo de 4,5:1 nos textos. `lang="pt-BR"` nos dois apps.
- [ ] Os dois apps funcionam com zoom de 200% e na largura de 320 px.

### FTRV-08 · Textos de interface centralizados (i18n)

**Estimativa:** P · **Marco:** Evolução

Hoje só existe português. A decisão é se vale extrair os textos agora.

**Critérios de aceite**

- [ ] Decisão registrada: `@jsverse/transloco`, i18n nativo do Angular ou manter os textos no template.
- [ ] Se adotar i18n, os textos do portal ficam num arquivo `pt-BR` sem requisição externa.

### FTRV-09 · Tema e componentes base

**Estimativa:** M · **Marco:** MVP

- **Telas e componentes:** tema Material com tokens próprios, `PageHeader`, `EmptyState`, `LoadingState`,
  `ConfirmDialog`, `StatusChip`, pipes de data em pt-BR. Substitui o `PagePlaceholder` à medida que as telas ficam
  prontas.

**Critérios de aceite**

- [ ] Confirmações usam `ConfirmDialog` (nunca `window.confirm`).
- [ ] Pipe de data só com dia para o portal e pipe com data e hora exata para o backoffice (decisão D25).
- [ ] `StatusChip` com cor e texto, nunca só cor.
- [ ] Componentes com testes unitários e sem estilos inline sem nonce.

### FTRV-10 · Padrão de estado e formulários

**Estimativa:** P · **Marco:** MVP

**Critérios de aceite**

- [ ] Decisão registrada: `@ngrx/signals` (SignalStore) ou serviços com signals.
- [ ] Formulários reativos tipados. Nenhum estado persistido no navegador.
- [ ] Estado sensível (rascunho do relato, dados da denúncia aberta, identidade revelada) é limpo ao sair da tela ou
      encerrar a sessão.

### FTRV-11 · Proteção de dados no cliente

**Estimativa:** P · **Marco:** MVP · **Depende de:** FTRV-06

**Critérios de aceite**

- [ ] Regra de lint contra `console.*` no código dos apps (as regras contra `localStorage`, `sessionStorage` e
      `document.cookie` já existem).
- [ ] Build de produção sem source maps publicados.
- [ ] Teste e2e confirma que `localStorage`, `sessionStorage` e IndexedDB continuam vazios depois do fluxo completo.
- [ ] Campos de relato e chave com `autocomplete="off"` e sem correção ortográfica do navegador (`spellcheck="false"`)
      onde o texto não é livre.
