# Quickstart: validar a base transversal

Roteiro para provar que a feature funciona de ponta a ponta. Os detalhes de cada regra estão em
[contracts/](./contracts/) e [data-model.md](./data-model.md).

## Pré-requisitos

- Node.js 26 e Docker com Compose.
- API rodando em `http://localhost:3000` (repositório `canal-denuncias-api`: `docker compose up -d`,
  `npm run migration:run`, `npm run start:dev`).
- `openapi/public.json` e `openapi/admin.json` sincronizados com a API (`npm run api:sync`, depois de
  `npm run openapi:export` no repositório da API).

## 1. Contrato e cliente gerado (FTRV-01)

```bash
npm ci
npm run api:generate
git diff --exit-code projects/shared/src/lib/api/generated   # não pode haver diferença
```

Esperado: sem diferença. Edite um campo de `openapi/public.json` sem regerar e rode `npm run api:check`: deve falhar.

## 2. Qualidade estática (FTRV-11)

```bash
npm run lint && npm run format:check && npm test && npm run build
```

Esperado: tudo verde. Um `console.log` em `projects/portal/src` faz o lint falhar. Um import de
`@canal/shared/api/admin` dentro do portal faz o lint falhar. O build de produção não gera arquivos `.map`.

## 3. Ambiente local no mesmo endereço (FTRV-04)

```bash
docker compose up -d --build
curl -sI http://localhost:4200/ | grep -i content-security-policy   # connect-src 'self'
curl -s http://localhost:4200/api/public/v1/rota-inexistente          # 404 no formato da API, via proxy
```

Esperado:

- A CSP traz `connect-src 'self'`.
- A rota inexistente volta com o corpo de erro da API (`statusCode`, `error`, `message`, `requestId`), o que prova que o
  proxy do portal chegou à API. Os health checks da API ficam fora do prefixo `/api` e não passam pelo proxy.
- No log da API, a requisição vinda do portal chega sem `X-Forwarded-For`.
- No backoffice (`http://localhost:4300`), um `POST` administrativo leva o cabeçalho `X-XSRF-TOKEN`.

## 4. Testes e2e com as guardas de privacidade (FTRV-05, 06, 07)

```bash
npm run e2e
```

Esperado: Chromium e Firefox navegam por todas as rotas existentes dos dois apps. Nenhuma requisição externa, nenhuma
violação de CSP ou Trusted Types, armazenamento vazio, nenhuma violação séria ou crítica de acessibilidade no portal.
O relatório fica em `e2e/report/` (fora do Git).

## 5. Erros e sessão (FTRV-02, FTRV-03)

Coberto pelos testes unitários do passo 2:

- cada status de [error-messages.md](./contracts/error-messages.md) gera a mensagem esperada;
- 401 no backoffice leva a `/login`, e 401 no portal limpa a sessão e leva a `/consultar`;
- o portal nunca envia cookies e só envia `Authorization` em `/public/v1/me/*`.

## 6. Verificação manual de CSP (FTRV-05)

Abra `http://localhost:4200` e `http://localhost:4300` em janelas anônimas do Chrome e do Firefox, abra um diálogo, um
aviso e um menu, e confira que o console não mostra violações. Erros de fonte vindos de extensões não contam: a janela
anônima não carrega extensões.
