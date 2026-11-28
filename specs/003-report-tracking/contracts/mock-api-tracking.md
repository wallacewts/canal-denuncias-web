# Contrato: rotas de acompanhamento no servidor simulado (`tools/mock-api/server.mjs`)

Extensão do simulador da feature 002 (`specs/002-report-submission-wizard/contracts/mock-api.md`). Usado só no e2e e
no desenvolvimento. Segue PUB-01, PUB-02, PUB-03, MSG-01 e MSG-02 do backlog da API (com o MSG-02 ajustado para só a
data) até esses endpoints existirem no contrato OpenAPI. Isolamento por `x-mock-session`, cenários por
`POST /__mock/scenario` e contadores por `GET /__mock/stats`, como na 002.

## `POST /api/public/v1/tracking/sessions`

Corpo: `{ "protocol": string, "accessKey": string }` (`strictObject`; campo extra → 400).

| Cenário (`access`) | Resposta                                                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok` (padrão)      | 200 `{ "token": "SIMULADA.<sessão>.<n>", "expiresAt": "<agora + 15 min, ISO>" }` se o protocolo for `DV-SIMUL-ADO00` e a chave começar com `SIMULADA`; senão 401 |
| `invalid`          | 401 `ApiError` genérico                                                                                                                                          |
| `rate-limited`     | 429 `ApiError`                                                                                                                                                   |
| `error`            | 500 `ApiError`                                                                                                                                                   |
| `slow`             | Resposta do `ok` depois de 2 s                                                                                                                                   |

Conta as aberturas (`stats.sessions`) para o teste de clique duplo.

## Guard simulado de `/api/public/v1/me/*`

Sem `Authorization: Bearer SIMULADA.…`, com token de outra sessão de teste ou expirado (pelo `expiresAt` emitido) →
401 `ApiError`. O cenário `me: "unauthorized"` força 401 em qualquer rota `/me/*`.

## `GET /api/public/v1/me/report`

| Cenário (`report`)        | Resposta 200                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `received` (padrão)       | `status: RECEIVED`, `canReply: true`, linha do tempo com 1 item                                        |
| `in-review`               | `status: IN_REVIEW`, `canReply: true`                                                                  |
| `awaiting`                | `status: AWAITING_REPORTER`, `replyDeadline` daqui a 5 dias, `canReply: true`                          |
| `awaiting-overdue`        | `status: AWAITING_REPORTER`, `replyDeadline` ontem, `canReply: true`                                   |
| `concluded-substantiated` | `status: CONCLUDED`, `outcome: SUBSTANTIATED`, `canReply: false` (idem `-partial`, `-unsubstantiated`) |
| `closed`                  | `status: CLOSED`, `canReply: false`                                                                    |
| `error`                   | 500 `ApiError`                                                                                         |

Formato: `{ status, outcome, replyDeadline, category: { code, name }, receivedOn, timeline: [{ on, status }], canReply }`.
Categoria com nome contendo `SIMULADA` (sentinela). Nenhum campo com o relato original.

## `GET /api/public/v1/me/messages`

200 `{ "items": [{ "id", "author": "REPORTER" | "TEAM", "body", "sentOn": "AAAA-MM-DD" }] }`, em ordem cronológica.
Cenários `messages`: `some` (padrão, 2 da equipe e 1 do denunciante), `empty`, `error`. Depois de
`POST /__mock/new-team-message`, a próxima leitura traz uma mensagem nova da equipe (para testar "Atualizar"). Nenhum
campo com nome de pessoa.

## `POST /api/public/v1/me/messages`

Corpo: `{ "body": string }` com 1 a 5.000 caracteres (`strictObject`).

| Cenário (`send`) | Resposta                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `ok` (padrão)    | 201 com a mensagem criada (`author: REPORTER`); se o relatório estava `awaiting`, passa a `in-review` |
| `closed`         | 409 `ApiError` e o relatório da sessão passa a `closed`                                               |
| `invalid`        | 400 `ApiError` sem repetir o texto                                                                    |
| `error`          | 500 `ApiError`                                                                                        |
| `slow`           | `ok` depois de 2 s                                                                                    |

Conta os envios (`stats.messages`). Nunca registra o corpo em log.
