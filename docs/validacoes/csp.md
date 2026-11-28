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

Observação: no e2e, o Chromium trata as origens de teste (`http://portal:8080`, `http://backoffice:8080`) como seguras,
para aplicar os cabeçalhos que exigem HTTPS (como o `Cross-Origin-Opener-Policy`), como em produção. A CSP não muda.

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
