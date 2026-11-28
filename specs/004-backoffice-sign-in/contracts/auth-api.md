# Contrato: rotas de autenticação do backoffice (simulador e premissas da API)

Formato usado pelo simulador (`tools/mock-api`) e pelos tipos provisórios (`features/auth/auth.types.ts`) até AUTH-01 a
AUTH-07 e USERS-07 saírem no `canal-denuncias-api/openapi/admin.json`. Base: premissas de contrato já registradas pelo
backend em `docs/tarefas/04-auth.md` (AUTH-01 a AUTH-05) e `03-users.md` (USERS-07), e o fluxo descrito no ADR 0053.
Itens marcados **(a confirmar)** ainda não estão fixados no backlog da API; a integração (tarefas bloqueadas) confere
cada um contra o contrato real.

Todas as rotas: prefixo `/api/admin/v1`, chamadas na mesma origem (proxy `/api`), com credenciais. Sessão só pelo cookie
`HttpOnly` da API (`__Host-sid` em produção; `sid` sem `Secure` no simulador e no desenvolvimento por HTTP). O front não
lê, recebe nem envia token. Escrita de outra origem → 403 (proteção nativa por origem, AUTH-07).

## Tipos comuns

```text
NextStep         = 'MFA_REQUIRED' | 'MFA_ENROLLMENT_REQUIRED' | 'PASSWORD_CHANGE_REQUIRED' | 'DONE'
SessionExpiry    = { idleExpiresAt: string (ISO 8601 UTC), absoluteExpiresAt: string (ISO 8601 UTC) }
StepResponse     = { nextStep: NextStep } & SessionExpiry
CurrentUser      = { id: uuid, name: string, email: string, roles: Role[],
                     mfaEnabledAt: string | null, passwordChangeRequired: boolean,
                     abilities: Ability[] } & SessionExpiry
Role             = 'ADMIN' | 'COMPLIANCE_MANAGER' | 'ANALYST' | 'DPO' | 'AUDITOR'
Ability          = código `recurso.ação` da API (USERS-07), por exemplo 'reports.list', 'reports.read',
                   'reports.triage', 'users.manage', 'audit.read', 'settings.sla', 'retention.manage',
                   'identity.approve', 'dashboard.read'; habilidades por registro (como 'reports.read') só indicam
                   que a pessoa pode exercê-las em algum registro
```

`roles` é só para exibição em "Meu perfil"; menu e rotas usam só `abilities` (Q1).

## Rotas

| Método e caminho                         | Corpo                              | Sucesso                                                                  | Erros tratados pela tela                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/sign-in`                     | `{ email, password }`              | 200 `StepResponse` + cookie de sessão pendente                           | 401 genérico (qualquer falha de credencial, inclusive conta bloqueada, desativada ou com bloqueio temporário) e 429 do limite de tentativas: **a mesma mensagem genérica**, sem mensagem própria de bloqueio                                                                                                                                                                        |
| `POST /auth/mfa/challenge`               | `{ code }` ou `{ recoveryCode }`   | 200 `StepResponse` (`DONE`) + cookie **novo**                            | 401 código inválido; 423 bloqueio temporário **(código a confirmar)**; 401 com sessão pendente expirada                                                                                                                                                                                                                                                                             |
| `POST /auth/mfa/enrollment`              | —                                  | 200 `{ otpauthUri, qrCodeDataUri: 'data:image/png;base64,...', secret }` | 401 sessão encerrada                                                                                                                                                                                                                                                                                                                                                                |
| `POST /auth/mfa/enrollment/confirmation` | `{ code }`                         | 200 `{ recoveryCodes: string[10] } & StepResponse` + cookie novo         | 401 código inválido **(a confirmar: 401 ou 422)**                                                                                                                                                                                                                                                                                                                                   |
| `PUT /me/password`                       | `{ currentPassword, newPassword }` | 200 `StepResponse` + cookie novo (outras sessões encerradas)             | 422 `{ code: 'CURRENT_PASSWORD_INVALID' }` (senha atual errada: erro no campo, sessão mantida); 422 `{ code: 'PASSWORD_TOO_SHORT' \| 'PASSWORD_COMMON' }` (política, códigos do AUTH-05); 429 depois de 5 erros de senha atual na mesma sessão, com a sessão encerrada pela API (o front volta ao login com a mensagem de sessão encerrada); 401 só para sessão ausente ou expirada |
| `POST /auth/sign-out`                    | —                                  | 204, cookie apagado                                                      | qualquer erro: o front limpa a memória do mesmo jeito                                                                                                                                                                                                                                                                                                                               |
| `GET /me`                                | —                                  | 200 `CurrentUser`                                                        | 401 sem sessão / expirada / pendente                                                                                                                                                                                                                                                                                                                                                |

Regras:

- `qrCodeDataUri` precisa ser PNG em base64. Outro formato é recusado pela validação em tempo de execução (o sanitizador
  do Angular não aceita SVG embutido sem bypass, que a constituição proíbe).
- `recoveryCodes` vem uma única vez, só na confirmação do cadastro.
- `idleExpiresAt` pode vir até 1 min antes do real (`touchInterval` da API, AUTH-02); o front usa margem de 60 s (R3).
- A senha nova é validada na tela só no tamanho mínimo e na confirmação; senha comum é decidida pela API (422).

## Premissas a levar ao backend (além das já registradas)

1. Formato de `abilities`: já registrado no USERS-07 (`recurso.ação`, inclusive habilidades por registro).
2. Código de resposta do bloqueio do desafio MFA: proposta `423` (distinto do `401` de código inválido e do `429` do
   rate limit).
3. Erros da troca de senha: `422` com código — `CURRENT_PASSWORD_INVALID` para senha atual errada e o código da regra
   para senha nova fora da política. `401` significa só sessão ausente ou expirada (decisão do usuário, 2026-11-28). Depois de 5 erros de senha atual na mesma sessão, `429`
   com a sessão encerrada (AUTH-05).
4. QR code em `data:image/png;base64`.

## Simulador

- Contas de cenário (com a sentinela `SIMULADA` no nome e no e-mail): `pronta`, `primeiro-acesso`, `bloqueada`,
  `desativada`, `sem-permissoes`. `bloqueada` responde 401 genérico, igual à senha errada.
- Cenários por sessão de teste (`x-mock-session`): `sign-in: rate-limited` (429 na etapa da senha, tratado com a mesma
  mensagem genérica), `challenge: invalid | locked`, `password: common | short | current-invalid` (`PASSWORD_COMMON`, `PASSWORD_TOO_SHORT`, (422 `CURRENT_PASSWORD_INVALID`; na 5ª senha atual errada da mesma
  sessão, 429 e a sessão simulada é encerrada, então chamadas seguintes recebem 401),
  `me: expired`, relógio controlado para os horários de expiração.
- Proteção por origem igual à da API (R9 do research) em todo método que altera dados em `/api/admin`.
- Não registra corpo de requisição (senhas e códigos nunca vão para o log do simulador).
