# Contrato: servidor simulado da API (`tools/mock-api/server.mjs`)

Usado só no e2e e no desenvolvimento local (research.md R1). Nunca importado pelos apps. Segue os formatos de CAT-01
e REP-02 do backlog da API até eles existirem no contrato OpenAPI.

## Rotas simuladas

### `GET /api/public/v1/categories`

| Cenário (`categories`) | Resposta                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ok` (padrão)          | 200, `[{ "code": "SIMULADA_VAZAMENTO", "name": "Vazamento de dados", "description": "…" }, …]` (3 itens, na ordem de `sort_order`) |
| `empty`                | 200, `[]`                                                                                                                          |
| `error`                | 500, corpo no formato `ApiError` da API, com `requestId`                                                                           |

### `POST /api/public/v1/reports`

| Cenário (`submit`) | Resposta                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `ok` (padrão)      | 201, `{ "protocol": "DV-SIMUL-ADO00", "accessKey": "SIMULADA-…", "receivedOn": "AAAA-MM-DD" }` |
| `invalid`          | 400, `ApiError` com código de validação e caminho do campo, **sem** repetir o valor enviado    |
| `error`            | 500, `ApiError`                                                                                |
| `slow`             | 201 depois de 2 s (para testar o botão desabilitado e o clique duplo)                          |

- O simulador valida o corpo com as regras de REP-02 (campos permitidos, limites) e responde 400 se o front mandar
  algo fora do contrato. Assim o e2e pega divergência entre o front e o backlog.
- Conta os envios recebidos por cenário (`GET /__mock/stats`), para o teste do clique duplo provar que houve só um.
- Nunca registra o corpo recebido em log.

## Controle

- `POST /__mock/scenario` com `{ "categories": "...", "submit": "..." }`: troca o cenário. `POST /__mock/reset`: volta
  ao padrão e zera os contadores.
- As rotas `/fixture/*` e o eco de qualquer outra rota continuam como no servidor de eco da feature 001.

## Sentinelas (prova de que nada simulado está no build)

`SIMULADA`, `DV-SIMUL` e `__mock` aparecem só no simulador. O `scripts/check-build-output.mjs` reprova o build se
encontrar qualquer um deles, ou `mock-api`, em `dist/`.
