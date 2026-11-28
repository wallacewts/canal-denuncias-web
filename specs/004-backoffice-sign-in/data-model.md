# Data Model: Acesso da equipe ao backoffice

Tudo só em memória. Nada vai para armazenamento do navegador, URL ou console. Os tipos das respostas da API estão em
`contracts/auth-api.md` (provisórios até o contrato real).

## StaffSession (serviço raiz do backoffice)

| Campo               | Tipo                           | Origem                                                                   | Regra                                      |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------ |
| `user`              | `CurrentUser \| null`          | `GET /me`                                                                | Nulo até restaurar; zerado no encerramento |
| `abilities`         | `Set<Ability>`                 | `user.abilities`                                                         | Fonte única de menu e `permissionGuard`    |
| `idleWindowMs`      | `number \| null`               | `idleExpiresAt − instante da resposta`                                   | Derivado da API; nunca escrito no código   |
| `absoluteExpiresAt` | `Date \| null`                 | login, desafio, `/me`                                                    | Fixo durante a sessão                      |
| `lastActivityAt`    | `Date \| null`                 | resposta 2xx de chamada administrativa ou evento `activity` de outra aba | Reprograma o aviso de inatividade          |
| `clockSkewMs`       | `number`                       | cabeçalho `Date` × relógio local                                         | Corrige os temporizadores                  |
| `returnUrl`         | `string \| null`               | `authGuard`                                                              | Só caminho interno; zerado depois do uso   |
| `endReason`         | `EndReason \| null`            | `end()`                                                                  | Lido e limpo pela tela de login            |
| `warning`           | `'idle' \| 'absolute' \| null` | temporizadores                                                           | Controla a faixa de aviso                  |

`EndReason = 'signed-out' | 'idle' | 'absolute' | 'unauthenticated' | 'other-tab'`.

### Transições

```text
anônimo ──GET /me 200──▶ autenticado
anônimo ──login + etapas──▶ (SignInFlow) ──DONE──▶ autenticado
autenticado ──expiração esperada − 60 s──▶ aviso de inatividade ──Continuar (GET /me)──▶ autenticado
autenticado ──absoluteExpiresAt − 60 s──▶ aviso absoluto
autenticado ──inatividade | absoluto | 401 | Sair | evento ended──▶ end(reason) ──▶ anônimo (/login, replaceUrl)
```

`end()` é idempotente, avisa as outras abas (exceto quando o motivo é `other-tab`) e descarta respostas que chegarem
depois (mesmo padrão `isCurrent` do `ReporterAccess` da feature 003).

## SignInFlow (escopo dos componentes-pai `/login` e `/primeiro-acesso`)

| Campo        | Tipo               | Regra                                                    |
| ------------ | ------------------ | -------------------------------------------------------- |
| `step`       | `NextStep \| null` | Última etapa informada pela API; decide a rota permitida |
| `expiry`     | `SessionExpiry`    | Repassado ao `StaffSession` quando `step = DONE`         |
| `submitting` | `boolean`          | Bloqueia clique duplo                                    |

## EnrollmentState (`ScreenState` de `/primeiro-acesso/autenticador` e `/primeiro-acesso/codigos`)

| Campo           | Tipo                 | Regra                                                             |
| --------------- | -------------------- | ----------------------------------------------------------------- |
| `qrCodeDataUri` | `string`             | Só `data:image/png;base64,...`                                    |
| `secret`        | `string`             | Exibido em blocos de 4; apagado ao sair da tela                   |
| `recoveryCodes` | `string[10] \| null` | Recebido na confirmação; exibido uma vez; apagado ao sair da tela |
| `saved`         | `boolean`            | Caixa "Guardei os códigos"; habilita "Continuar"                  |

## Mensagens entre abas (`BroadcastChannel('canal-backoffice-session')`)

```text
{ type: 'activity', at: number }          // houve chamada administrativa bem-sucedida
{ type: 'ended', reason: EndReason }      // a aba de origem encerrou a sessão
```

Nenhum dado de usuário ou de denúncia.
