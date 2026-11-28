# Contrato: rotas de autenticação do backoffice (simulador e premissas da API)

Formato usado pelo simulador (`tools/mock-api`) e pelos tipos provisórios (`features/auth/auth.types.ts`) até AUTH-01 a
AUTH-07 e USERS-07 saírem no `canal-denuncias-api/openapi/admin.json`. Base: premissas de contrato já registradas pelo
backend em `docs/tarefas/04-auth.md` (AUTH-01 a AUTH-05) e `03-users.md` (USERS-07), e o fluxo descrito no ADR 0053.
**Integrado (T046 e T047, 2026-11-28):** o front usa o cliente gerado de `openapi/admin.json` (API `21df70c`). Conferido
contra a API real: códigos de domínio no topo do corpo (`code`, D56, não em `message`); `423 MFA_LOCKED`; `429
TOO_MANY_ATTEMPTS` no login e no desafio; `429 CURRENT_PASSWORD_ATTEMPTS_EXCEEDED` na 5ª senha atual errada;
`422 PASSWORD_TOO_LONG` (mensagem da política de senha); sair sem sessão responde `204` sem cookie. O simulador segue
esse formato.

Todas as rotas: prefixo `/api/admin/v1`, chamadas na mesma origem (proxy `/api`), com credenciais. Sessão só pelo cookie
`HttpOnly` da API (`__Host-sid` em produção; `sid` sem `Secure` no simulador e no desenvolvimento por HTTP). O front não
lê, recebe nem envia token. Escrita de outra origem → 403 (proteção nativa por origem, AUTH-07). O nome diferente do
cookie não muda nada para o front, que nunca o lê.

**401 significa só sessão ausente ou expirada, em todo o fluxo** (decisão do usuário, feature 006 do backend). Erro do
que a pessoa digitou é `422` com código e aparece no campo, sem encerrar a sessão.

**Ordem das etapas** (decidida pela API, o front só segue `nextStep`): sem autenticador, troca da senha provisória e
depois cadastro do segundo fator; com autenticador e troca de senha exigida (senha redefinida), desafio do segundo
fator primeiro e depois a troca.

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

| Método e caminho                         | Corpo                              | Sucesso                                                                                                | Erros tratados pela tela                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/sign-in`                     | `{ email, password }`              | 200 `StepResponse` + cookie de sessão pendente                                                         | 401 genérico (qualquer falha de credencial, inclusive conta bloqueada, desativada ou com bloqueio temporário) e 429 do limite de tentativas: **a mesma mensagem genérica**, sem mensagem própria de bloqueio                                                                                                                                                                                                                                                |
| `POST /auth/mfa/challenge`               | `{ code }` ou `{ recoveryCode }`   | 200 `StepResponse` (`DONE` ou `PASSWORD_CHANGE_REQUIRED`) + cookie **novo**                            | 422 `{ code: 'MFA_CODE_INVALID' }` (código do autenticador ou de recuperação errado: erro no campo, sessão mantida); 423 bloqueio temporário; 429 limite de tentativas (mensagem genérica de excesso de tentativas da base de erros); 401 só com sessão pendente ausente ou expirada                                                                                                                                                                        |
| `POST /auth/mfa/enrollment`              | —                                  | 200 `{ otpauthUri, qrCodeDataUri: 'data:image/png;base64,...', secret }`                               | 401 sessão encerrada                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `POST /auth/mfa/enrollment/confirmation` | `{ code }`                         | 200 `{ recoveryCodes: string[10] } & StepResponse` + cookie novo                                       | 422 `{ code: 'MFA_CODE_INVALID' }` (erro no campo, sessão mantida); 401 só com sessão ausente ou expirada                                                                                                                                                                                                                                                                                                                                                   |
| `PUT /me/password`                       | `{ currentPassword, newPassword }` | 200 `StepResponse` + cookie novo (outras sessões encerradas)                                           | 422 `{ code: 'CURRENT_PASSWORD_INVALID' }` (senha atual errada: erro no campo, sessão mantida); 422 `{ code: 'PASSWORD_TOO_SHORT' \| 'PASSWORD_COMMON' \| 'PASSWORD_SAME_AS_CURRENT' }` (política, códigos do AUTH-05; senha igual à atual com mensagem própria); 429 depois de 5 erros de senha atual na mesma sessão, com a sessão encerrada pela API (o front volta ao login com a mensagem de sessão encerrada); 401 só para sessão ausente ou expirada |
| `POST /auth/sign-out`                    | —                                  | 204, cookie apagado                                                                                    | qualquer erro: o front limpa a memória do mesmo jeito                                                                                                                                                                                                                                                                                                                                                                                                       |
| `GET /me`                                | —                                  | 200 `CurrentUser` (com `passwordChangeRequired: true` se o segundo fator já foi feito e falta a troca) | 401 sem sessão, expirada ou antes do segundo fator (AUTH-03)                                                                                                                                                                                                                                                                                                                                                                                                |

Regras:

- **Etapa fora de hora:** rota de etapa (desafio, cadastro, confirmação, troca de senha) chamada fora da etapa da
  sessão responde `403 { code: 'STEP_NOT_ALLOWED' }`, não 401. O front leva à etapa certa (ou ao painel, se tudo já foi
  concluído), sem encerrar a sessão e sem a mensagem de sessão encerrada.
- **Troca de senha pendente depois do segundo fator:** as demais rotas administrativas respondem
  `403 { code: 'PASSWORD_CHANGE_REQUIRED' }`; ficam liberadas só `PUT /me/password`, `POST /auth/sign-out` e `GET /me`.
  O front leva à troca de senha, sem a tela de acesso negado. Ao recarregar, o `/me` com `passwordChangeRequired: true`
  restaura a etapa.
- O `code` desses 403 é lido no corpo (`code`) ou nos itens de `message`; o formato exato é conferido na T047.

- `qrCodeDataUri` precisa ser PNG em base64. Outro formato é recusado pela validação em tempo de execução (o sanitizador
  do Angular não aceita SVG embutido sem bypass, que a constituição proíbe).
- `recoveryCodes` vem uma única vez, só na confirmação do cadastro.
- `idleExpiresAt` pode vir até 1 min antes do real (`touchInterval` da API, AUTH-02); o front usa margem de 60 s (R3).
- A senha nova é validada na tela só no tamanho mínimo e na confirmação; senha comum é decidida pela API (422).

## Premissas a levar ao backend (além das já registradas)

1. Formato de `abilities`: já registrado no USERS-07 (`recurso.ação`, inclusive habilidades por registro).
2. Bloqueio do desafio MFA: `423` (decidido; distinto do `422 MFA_CODE_INVALID` de código errado e do `429` do rate
   limit). Código errado no desafio e na confirmação do cadastro: `422 MFA_CODE_INVALID` (decidido, feature 006 do
   backend).
3. Erros da troca de senha: `422` com código — `CURRENT_PASSWORD_INVALID` para senha atual errada e o código da regra
   para senha nova fora da política (`PASSWORD_TOO_SHORT`, `PASSWORD_COMMON`, `PASSWORD_SAME_AS_CURRENT`). `401` significa só sessão ausente ou expirada (decisão do usuário, 2026-11-28). Depois de 5 erros de senha atual na mesma sessão, `429`
   com a sessão encerrada (AUTH-05).
4. QR code em `data:image/png;base64`.

## Simulador

- Contas de cenário (com a sentinela `SIMULADA` no nome e no e-mail): `pronta`, `primeiro-acesso`, `bloqueada`,
  `desativada`, `sem-permissoes` e `troca-com-autenticador` (já tem autenticador e precisa trocar a senha: desafio
  primeiro, depois a troca). `bloqueada` responde 401 genérico, igual à senha errada.
- Cenários por sessão de teste (`x-mock-session`): `sign-in: rate-limited` (429 na etapa da senha, tratado com a mesma
  mensagem genérica), `challenge: invalid | locked | rate-limited` (422 `MFA_CODE_INVALID`, 423 e 429), `password: common | short | current-invalid` (`PASSWORD_COMMON`, `PASSWORD_TOO_SHORT`, (422 `CURRENT_PASSWORD_INVALID`; na 5ª senha atual errada da mesma
  sessão, 429 e a sessão simulada é encerrada, então chamadas seguintes recebem 401),
  `me: expired`, relógio controlado para os horários de expiração.
- Etapa fora de hora: 403 `STEP_NOT_ALLOWED`. Troca de senha pendente depois do segundo fator: 403
  `PASSWORD_CHANGE_REQUIRED` em qualquer outra rota de `/api/admin/v1`.
- Proteção por origem igual à da API (R9 do research) em todo método que altera dados em `/api/admin`.
- Não registra corpo de requisição (senhas e códigos nunca vão para o log do simulador).
