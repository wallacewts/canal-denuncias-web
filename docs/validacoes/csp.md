# Validações da base transversal (001-shared-foundation)

## CSP e Trusted Types em navegador real (FTRV-05)

### 2026-11-27 · Automática (e2e)

- **Ambiente:** imagens nginx dos dois apps, construídas pelo `docker-compose.e2e.yml`, com a CSP de produção (nonce
  por requisição, `require-trusted-types-for 'script'`, `default-src 'none'`).
- **Navegadores:** Chromium 159.0.8154.6 e Firefox 159.0 (imagem `mcr.microsoft.com/playwright:v1.65.1-noble`), sem
  extensões e sem `bypassCSP`.
- **Escopo:** as 13 rotas do portal e as 10 rotas do backoffice que existem hoje (placeholders), com a fixture
  `privacyGuards` (violação de CSP e Trusted Types, requisição externa, armazenamento, console).
- **Resultado:** zero violações de CSP ou de Trusted Types. Na última execução da feature, o e2e completo teve 196
  testes passando (rotas, acessibilidade, layout em telas estreitas, proxy `/api` e a própria fixture).

Observação (corrigida na feature 002): a intenção era que o Chromium do e2e tratasse as origens de teste como seguras,
para aplicar os cabeçalhos que exigem HTTPS (como o `Cross-Origin-Opener-Policy`). Na prática a flag não tinha efeito:
o Playwright usa por padrão o `chromium-headless-shell`, que a ignora, e `isSecureContext` ficava falso. Ver a seção da
feature 002 abaixo.

### Pendente

- **Componentes que injetam estilo ou DOM** (diálogo, aviso, menu, tooltip, datepicker, select): ainda não aparecem em
  nenhuma rota. Entram na validação quando as telas os usarem (snackbar na US2, diálogo de confirmação na US3).
- **Conferência manual** em janela anônima do Chrome e do Firefox de desktop, pela equipe, com o ambiente local
  (`docker compose up -d`).

## Roteiro do quickstart (T077) · 2026-11-27

| Passo                 | O que foi feito                                                                 | Resultado                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1. Contrato e cliente | `npm run api:sync` (contratos do commit `3837529` da API) e `npm run api:check` | ok, cliente em dia                                                                                                        |
| 2. Qualidade estática | lint, `lint:rules` (9/9), Prettier, testes unitários (87), build, `check:build` | tudo verde; portal com 373,66 kB                                                                                          |
| 3. Mesmo endereço     | `docker compose up -d --build` com a API real em `localhost:3000`               | `connect-src 'self'` nos dois apps; `/api` do portal e do backoffice chega à API (404 no formato da API, com `requestId`) |
| 3. XSRF               | `POST` administrativo com `X-XSRF-TOKEN`                                        | pendente: T058, bloqueada por AUTH-07                                                                                     |
| 4. E2E                | `npm run e2e`                                                                   | 196 testes passando, Chromium 159 e Firefox 159                                                                           |
| 5. Erros e sessão     | testes unitários                                                                | ok (cada status, 401 nas duas políticas, credenciais)                                                                     |
| 6. CSP manual         | janelas anônimas do Chrome e do Firefox de desktop                              | pendente: conferência da equipe                                                                                           |

A ausência de IP e de cookies no que o proxy do portal entrega à API foi provada no e2e com o servidor de eco (que
devolve os cabeçalhos recebidos), inclusive com `X-Forwarded-For`, `X-Real-IP` e `Forwarded` forjados pelo cliente.

## Revisão das mensagens de erro (SC-008) · 2026-11-27

Cada mensagem de `contracts/error-messages.md` foi conferida contra a regra da constituição: dizer o que aconteceu e o
que fazer.

| Status                    | Diz o que aconteceu | Diz o que fazer | Ajuste                                                  |
| ------------------------- | ------------------- | --------------- | ------------------------------------------------------- |
| 0                         | sim                 | sim             | —                                                       |
| 400                       | sim                 | sim             | —                                                       |
| 401 (backoffice e portal) | sim                 | sim             | —                                                       |
| 403                       | sim                 | sim             | —                                                       |
| 404                       | sim                 | não             | acrescentado "Volte à página anterior e tente de novo." |
| 409                       | sim                 | sim             | —                                                       |
| 410                       | sim                 | não             | acrescentado "Volte à página inicial para continuar."   |
| 429                       | sim                 | sim             | —                                                       |
| 5xx e erro inesperado     | sim                 | sim             | —                                                       |

# Validações do envio de denúncia (002-report-submission-wizard)

## CSP e Trusted Types com os componentes novos · 2026-11-28

- **Componentes que agora aparecem nas telas e passam pelas guardas de CSP nos dois navegadores:** diálogo do Material
  (aviso de privacidade na revisão e `ConfirmDialog` dos avisos de saída e de inatividade), snackbar (aviso de
  descarte por inatividade), radio, checkbox, `select` nativo dentro de `mat-form-field` e `input type="date"`.
- **Resultado:** zero violações de CSP ou de Trusted Types nos e2e do fluxo (`new-report.spec.ts`,
  `new-report-draft.spec.ts`, `a11y.spec.ts`, `layout.spec.ts`, `home.spec.ts`), com a fixture `privacyGuards`.
- **Download do comprovante (`.txt`):** `Blob` e âncora com `download`, sem sink de Trusted Types e sem mudar a CSP.
  O e2e confere o arquivo baixado nos dois navegadores.
- **Ainda não validados:** menu, tooltip e datepicker do Material, que nenhuma tela usa. A conferência manual pela equipe
  continua pendente (T027 da feature 001).

## COOP no e2e · 2026-11-28

- **Problema:** o `Cross-Origin-Opener-Policy: same-origin` só é aplicado em contexto seguro. No e2e as origens são
  `http://portal:8080` e `http://backoffice:8080`, e o Chromium não aplicava o cabeçalho, porque o
  `chromium-headless-shell` (padrão do Playwright) ignora a flag `--unsafely-treat-insecure-origin-as-secure`.
- **Correção:** o projeto Chromium do Playwright passou a usar `channel: 'chromium'` (Chromium completo, novo headless),
  que respeita a flag. Com isso `isSecureContext` é verdadeiro e o COOP é aplicado como em produção. A CSP não muda.
- **Prova:** `e2e/portal/coop.spec.ts` abre, a partir do portal, uma janela de outra origem e confere que ela **não**
  recebe `window.opener`. Um controle entre duas páginas sem COOP confere que o vínculo existe, provando que a
  asserção pode falhar.
- **Limitação conhecida:** o Firefox não tem flag equivalente e só aplica o COOP em HTTPS. O teste é pulado no Firefox.
  Em produção o portal roda em HTTPS (HSTS), e o cabeçalho é aplicado nos dois navegadores.

## Roteiro do quickstart (T055) · 2026-11-28

| Passo                        | O que foi feito                                                                          | Resultado                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1. Desenvolvimento local     | `npm run dev:mock-api` e chamadas a `/api/public/v1/categories` e `/reports`             | 3 categorias simuladas; envio devolve `DV-SIMUL-ADO00`, a chave simulada e a data só com o dia |
| 2. Qualidade                 | lint, `lint:rules` (12/12), Prettier, unitários (190), build, `check:build`, `api:check` | tudo verde; portal com 413,41 kB (aviso em 440 kB)                                             |
| 2. E2E                       | `npm run e2e`                                                                            | 225 passando e 1 pulado (COOP no Firefox, limitação acima), Chromium e Firefox                 |
| 3. Simulado fora do build    | `npm run test:scripts` (inclui o build falso com `DV-SIMUL`)                             | 29/29; o `check:build` reprova cada sentinela                                                  |
| 4. Integração com a API      | `api:sync`, `api:generate`, `api:check` com CAT-01 e REP-02                              | pendente: T047 a T050, bloqueadas até a API publicar os endpoints                              |
| 5. Validação manual (SC-001) | uma pessoa envia sem ajuda em menos de 5 minutos                                         | pendente: revisão da equipe                                                                    |
