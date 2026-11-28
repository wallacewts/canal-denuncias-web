# Canal de Denúncias — Web

Front-end do Canal de Denúncias de Vazamento de Dados. Um workspace Angular com dois apps e uma lib compartilhada:

| Projeto               | O que é                                                                                  | Porta local |
| --------------------- | ---------------------------------------------------------------------------------------- | ----------- |
| `projects/portal`     | Portal público do denunciante (anônimo)                                                  | 4200        |
| `projects/backoffice` | Backoffice da equipe interna                                                             | 4300        |
| `projects/shared`     | Configuração em tempo de execução, cliente da API e componentes comuns (`@canal/shared`) | —           |

Os dois apps são buildados e publicados separadamente: o código do backoffice nunca vai no bundle público, e o
backoffice pode ficar restrito à rede interna. A API fica no repositório `canal-denuncias-api`.

## Backlog

As tarefas para implementar as telas estão em [`docs/tarefas/`](docs/tarefas/README.md), com as dependências em
relação ao backlog da API.

## Stack

Angular 22 (standalone, signals, zoneless, lazy loading), Angular Material 22, Vitest, ESLint (angular-eslint) e
Prettier. Imagens servidas por `nginxinc/nginx-unprivileged`.

## Rodando localmente

Pré-requisitos: Node.js 26 e Docker. A versão exata do Node fica em `.tool-versions` (`asdf install` instala). Os testes
de ponta a ponta (`npm run e2e`) rodam no container do Playwright e usam o servidor simulado da API
(`tools/mock-api/server.mjs`).

```bash
npm ci
npm run start:portal       # http://localhost:4200
npm run start:backoffice   # http://localhost:4300
```

Em desenvolvimento, `ng serve` repassa `/api` para `http://localhost:3000` (ver `proxy.conf.json`), então a API fica
no mesmo domínio, como em produção. Enquanto a API não tiver os endpoints de categorias e de envio (CAT-01 e REP-02),
`npm run dev:mock-api` sobe o servidor simulado nessa porta, com protocolo e chave simulados (`DV-SIMUL-ADO00`).

Para rodar como em produção (nginx com os cabeçalhos de segurança e o proxy `/api`), com a API rodando no host em
`http://localhost:3000`:

```bash
docker compose up -d --build
```

Cada app repassa `/api` para a API (`APP_API_UPSTREAM`, no compose `http://host.docker.internal:3000`), como o proxy
de produção. Tudo fica no mesmo endereço, sem CORS, e o token XSRF funciona.

- **Proxy do portal:** remove `X-Forwarded-For`, `X-Real-IP`, `Forwarded` e `Cookie` antes de chegar à API, inclusive
  cabeçalhos de IP forjados pelo cliente, e descarta o `Set-Cookie` da resposta. Não registra acesso.
- **Proxy do backoffice:** repassa o IP real (a API audita as ações da equipe) e o cookie de sessão.

## Scripts

| Script                                      | Faz                                                                |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `npm run start:portal` / `start:backoffice` | Servidor de desenvolvimento                                        |
| `npm run build`                             | Build de produção dos dois apps (`dist/portal`, `dist/backoffice`) |
| `npm test`                                  | Testes unitários da lib e dos dois apps                            |
| `npm run lint` / `npm run format:check`     | Qualidade                                                          |
| `npm run lint:rules`                        | Prova que as regras de privacidade do lint continuam valendo       |
| `npm run check:build`                       | Build sem source maps, sem domínio externo e sem nada do simulador |
| `npm run dev:mock-api`                      | Servidor simulado da API na porta 3000 (`tools/mock-api`)          |
| `npm run api:sync`                          | Copia `openapi/public.json` e `admin.json` da API (`--from <dir>`) |
| `npm run api:generate`                      | Gera os clientes `@canal/shared/api/public` e `/admin`             |
| `npm run api:check`                         | Regera sem rede e falha se o cliente estiver desatualizado         |
| `npm run test:scripts`                      | Testes dos scripts (`api:sync`, `check:build`) e do simulador      |
| `npm run e2e`                               | Testes de ponta a ponta no container do Playwright                 |

## Testes de ponta a ponta

`npm run e2e` sobe os dois apps (imagens nginx de produção), o servidor simulado no lugar da API (`tools/mock-api`,
com cenários e contador separados por teste pelo cabeçalho `x-mock-session`) e roda o Playwright na imagem oficial
`mcr.microsoft.com/playwright:v1.65.1-noble`, com Chromium (canal `chromium`, que trata as origens de teste como
seguras) e Firefox. O host não precisa suportar o
Playwright. Pré-requisito: `npm ci`.

```text
e2e/
├── playwright.config.ts      # projetos fixture, portal e backoffice × Chromium e Firefox (sem bypassCSP)
├── fixtures/privacy-guards.ts # guardas automáticas: rede, URL, CSP/Trusted Types, armazenamento e console
├── support/                   # utilitários de layout e de chamada à API (o servidor simulado fica em tools/mock-api)
├── portal/                    # rotas, acessibilidade (axe), proxy /api, envio de denúncia, página inicial, COOP
└── backoffice/                # rotas, layout em telas estreitas, proxy /api
```

O relatório fica em `e2e/report/` (fora do Git). No CI, o job `e2e` publica o relatório como artefato.

## Configuração em tempo de execução

Cada app lê `/config.json` antes de iniciar. A mesma imagem serve todos os ambientes; só o arquivo montado muda:

```json
{ "apiBaseUrl": "/api" }
```

- **Produção:** `"/api"`, com o proxy reverso levando `/api` para a API no mesmo domínio. É o desenho recomendado:
  os cookies de sessão (`HttpOnly`, `Secure`, `SameSite=Strict`) e o token CSRF (`XSRF-TOKEN` → cabeçalho
  `X-XSRF-TOKEN`) só funcionam assim.
- **docker compose local:** também `"/api"` (arquivos em `docker/config/`), pelo proxy do nginx de cada app.

Chamadas à API usam o prefixo `api:`, que o interceptor troca pela URL base. A política de cada app decide as
credenciais: o portal nunca envia cookies, e o backoffice envia o cookie da sessão.

```ts
http.get('api:/public/v1/categories');
```

## Imagens Docker

```bash
docker build --build-arg APP=portal -t canal-denuncias-web-portal .
docker build --build-arg APP=backoffice -t canal-denuncias-web-backoffice .
```

| Variável           | Padrão                  | Uso                                                                 |
| ------------------ | ----------------------- | ------------------------------------------------------------------- |
| `APP_API_UPSTREAM` | `http://127.0.0.1:3000` | Endereço da API atrás do proxy `/api`. Sem ele, `/api` responde 502 |

A CSP tem `connect-src 'self'` fixo: a API sempre fica atrás do proxy `/api`, no mesmo endereço do app.

Monte o `config.json` em `/usr/share/nginx/html/config.json`.

O nginx de cada app (`docker/nginx/`) envia CSP com nonce aleatório por requisição, Trusted Types, HSTS,
`X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `nosniff`, `Permissions-Policy` e COOP/CORP. O `index.html` e
o `config.json` nunca vão para cache; os arquivos com hash têm cache longo.

## Regras de privacidade

- **O portal não registra acesso.** O nginx do portal roda com `access_log off`.
- **Nenhuma telemetria, analytics, CDN ou fonte externa.** As fontes (Roboto) vêm de `@fontsource` e ficam no bundle.
  O CI falha se o build referenciar um domínio externo conhecido. O analytics do Angular CLI está desligado.
- **Nada de `localStorage`, `sessionStorage` ou `document.cookie`.** A sessão é um cookie `HttpOnly` emitido pela API.
  O ESLint bloqueia esses usos.
- **Protocolo, chave e dados do relato nunca vão na URL.** O assistente de nova denúncia guarda o rascunho e o
  comprovante só em memória, numa rota-pai que os descarta ao sair, com aviso ao recarregar ou sair e descarte por
  inatividade (30 minutos, com aviso aos 25).
- **Nada do servidor simulado chega ao build.** Os apps não podem importar `tools/` nem `e2e/` (lint), e o
  `check:build` reprova o build que contiver um sentinela do simulador (`DV-SIMUL`, `SIMULADA`, `__mock`).

## Telas

| Portal (8)               | Backoffice (10)         |
| ------------------------ | ----------------------- |
| Início                   | Entrar (senha + MFA)    |
| Aviso de privacidade     | Painel                  |
| Nova denúncia (4 etapas) | Caixa de denúncias      |
| Revisão e envio          | Detalhe da denúncia     |
| Protocolo gerado         | Triagem e atribuição    |
| Consultar denúncia       | Relatórios e exportação |
| Acompanhamento           | Usuários e perfis       |
| Ajuda                    | Configurações           |
|                          | Trilha de auditoria     |
|                          | Meu perfil              |

No portal, a página inicial, as etapas da nova denúncia, a revisão, a tela do protocolo e o aviso de privacidade
estão implementados (feature 002), contra o servidor simulado até a API ter os endpoints. As demais telas são
placeholders.

## Commits

Conventional Commits, validados pelo `commitlint` no hook `commit-msg`. O `lint-staged` formata e roda o ESLint nos
arquivos alterados no `pre-commit`.
