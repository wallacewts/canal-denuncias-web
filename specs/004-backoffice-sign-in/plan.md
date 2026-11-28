# Implementation Plan: Acesso da equipe ao backoffice

**Branch**: `main` | **Date**: 2026-11-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-backoffice-sign-in/spec.md`

## Summary

Login da equipe com senha e segundo fator obrigatório, primeiro acesso (troca de senha provisória, cadastro do
aplicativo autenticador e códigos de recuperação exibidos uma vez), telas internas protegidas por permissões efetivas
vindas da API, avisos e encerramento da sessão a partir dos horários informados pela API, saída sincronizada entre abas
e "Meu perfil" com troca de senha. Segue as decisões da API (D53/D54, ADR 0053): sessão só por cookie `HttpOnly` no
servidor, sem tokens, proteção contra escrita de outra origem nativa do Nest. Implementado contra o simulador
`tools/mock-api`; a troca pelo cliente gerado fica em tarefas bloqueadas até AUTH-01 a AUTH-07 e USERS-07 saírem no
contrato.

## Technical Context

**Language/Version**: TypeScript, Angular 22 (standalone, signals, zoneless), Node 26.13.1

**Primary Dependencies**: Angular Material/CDK já instalados; nenhuma dependência nova de runtime ou de desenvolvimento

**Storage**: nenhum no navegador; estado só em memória (research R1); sessão = cookie `HttpOnly` da API

**Testing**: Vitest (unitários), Playwright no container oficial com `privacyGuards` e axe (e2e), testes do simulador
(`npm run test:scripts`)

**Target Platform**: navegadores atuais (Chromium e Firefox nos e2e), backoffice servido por nginx com CSP por nonce e
Trusted Types

**Project Type**: aplicação web (workspace Angular com `portal`, `backoffice` e lib `shared`)

**Performance Goals**: entrada em menos de 30 s (SC-001); primeiro acesso em menos de 5 min (SC-002)

**Constraints**: nada em URL, armazenamento do navegador ou console; nenhuma requisição externa; CSP e Trusted Types
intactas; QR code só como PNG embutido (R6); avisos com margem de 60 s (R3)

**Scale/Scope**: 5 telas novas de entrada e primeiro acesso, guards em 9 rotas do `Shell`, "Meu perfil"; bundle
inicial do backoffice de 347,0 kB para até ~355 kB (aviso em 700 kB)

**Bundle medido (T051, 2026-11-28):** backoffice 381,81 kB (previsão ~355 kB; aviso em 700 kB). O que pesou: código da
lib e do Material ligado ao bundle inicial pela sessão, guards e Shell (347,0 → 368,8 kB nas P1) e o `formatDate` do
`@angular/common` (+11,6 kB), que o esbuild põe no bundle inicial porque o arquivo dele já é alcançado pelo `main`; ele
entra pelo `staffDateTime` de "Meu perfil" e seria pago de qualquer forma pelas próximas telas da equipe com datas
(D25). Portal 417,36 kB (era 417,19 kB; +0,17 kB do `onForbidden` no `errorInterceptor` da lib; a extração do
`downloadTextFile` da T018 não mudou o tamanho).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Antes do design e depois dele (research, data model e contratos):

- [x] I. Anonimato: nenhuma requisição externa (QR code vem da API, R6); nada em URL, storage ou console; o caminho de
      retorno fica em memória; a feature não toca o portal além da extração da função do `.txt` (R7)
- [x] II. Navegador: CSP e Trusted Types intactas (`<img src>` com PNG embutido, sem bypass); sessão só no cookie
      `HttpOnly`/`Secure`/`SameSite=Strict` da API; proteção contra falsificação de requisição feita pela API por origem
      (AUTH-07) mais `SameSite=Strict`, com o backoffice sempre na mesma origem pelo proxy (R9). (princípio II, redação da constituição 1.0.1)
- [x] III. Fronteira: menu e rotas pelas permissões efetivas devolvidas pela API (Q1, R4); horários de expiração vindos
      da API (Q2, R3), sem a regra dos 15 min/8 h escrita no front; 401/403 da API tratados
- [x] IV. Acessibilidade: WCAG 2.1 AA nas telas novas, foco no título por etapa, avisos sem roubar o foco, axe nos e2e
      (o princípio fala do portal; o backoffice segue o mesmo padrão por FR-028)
- [x] V. Padrões Angular: standalone, signals, zoneless, `loadComponent` em todas as telas novas; código compartilhado na
      lib (função do `.txt` em `@canal/shared/files`, R7); cliente gerado — exceção provisória (ver Complexity Tracking)
- [x] VI. Testes: cada regra de privacidade com teste que falha (nada em storage/URL/console pelos `privacyGuards`;
      segredo e códigos somem ao sair; memória limpa em cada encerramento; escrita de outra origem recusada); e2e dos
      fluxos de entrada e primeiro acesso
- [x] VII. Qualidade: lint, `lint:rules`, testes, build dos dois apps, `check:build` e `api:check` verdes; bundle do
      portal sem crescimento e do backoffice medido; sem segredo no repositório
- [x] VIII. Simplicidade: só o que BAUTH-01 a 07 e BPRF-01/02 pedem; nenhuma dependência nova

## Project Structure

### Documentation (this feature)

```text
specs/004-backoffice-sign-in/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── auth-api.md
│   └── auth-routes.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
projects/backoffice/src/app/
├── app.routes.ts                          # fluxo de entrada fora do Shell; authGuard + permissionGuard + data.ability
├── app.config.ts                          # interceptor de atividade
├── api-policy.ts                          # silentUnauthenticated + onUnauthenticated → StaffSession.end
├── layout/
│   ├── shell.ts                           # menu por permissão, botão Sair, faixa de expiração
│   └── session-expiry-banner.ts           # novo: avisos de inatividade e de limite absoluto (R3)
└── features/
    ├── auth/
    │   ├── staff-session.ts               # novo: estado em memória, horários, end(), BroadcastChannel (R1, R2)
    │   ├── auth.guards.ts                 # novo: authGuard e permissionGuard (R4)
    │   ├── activity.interceptor.ts        # novo: marca atividade em respostas 2xx de /api/admin (R3)
    │   ├── auth.types.ts                  # novo: tipos provisórios + validação em tempo de execução (R10)
    │   ├── auth.api.ts                    # novo: chamadas das rotas de autenticação e /me
    │   ├── sign-in-flow.ts                # novo: etapa atual e bloqueio de pular etapas (R5)
    │   ├── login-page.ts                  # substitui o placeholder (BAUTH-01) + mensagem de encerramento
    │   ├── mfa-challenge-page.ts          # novo (BAUTH-02)
    │   ├── password-change-form.ts        # novo: formulário reaproveitado (BAUTH-04, BPRF-02)
    │   ├── password-change-page.ts        # novo (BAUTH-04)
    │   ├── mfa-enrollment-page.ts         # novo (BAUTH-03, QR code R6)
    │   ├── recovery-codes-page.ts         # novo (BAUTH-03, uma vez R7)
    │   └── access-denied.ts               # novo: tela de acesso negado
    └── profile/profile-page.ts            # substitui o placeholder (BPRF-01, BPRF-02)
projects/shared/src/
├── files.ts                               # novo: entrada secundária @canal/shared/files (R7)
└── lib/files/text-file.ts                 # movido de portal/features/new-report/receipt-file.ts (com testes)
projects/portal/src/app/features/new-report/
└── receipt-file.ts                        # passa a importar de @canal/shared/files (sem mudança de comportamento)
docker/nginx/backoffice.conf.template      # + proxy_set_header Host $host (hoje vai o host do upstream; R9)
tools/mock-api/
├── server.mjs                             # + rotas de autenticação, contas de cenário, proteção por origem (R8)
└── server.test.mjs                        # + testes das rotas e da proteção por origem
e2e/backoffice/
├── sign-in.spec.ts                        # novo: entrada, mensagem genérica, código, recuperação, bloqueio
├── first-access.spec.ts                   # novo: troca de senha, cadastro, códigos uma vez, recarga
├── guards.spec.ts                         # novo: sem sessão, retorno, menu por permissão, acesso negado, 403
├── session-expiry.spec.ts                 # novo: avisos e encerramentos com relógio controlado, abas, voltar
├── cross-origin.spec.ts                   # novo: escrita de outra origem recusada pelo simulador (FR-026)
├── profile.spec.ts                        # novo: meus dados e troca de senha
├── layout.spec.ts                         # + telas novas em 320 px e zoom de 200%
└── a11y.spec.ts                           # + telas novas
e2e/support/mock-api.ts                    # + cenários de autenticação
```

**Structure Decision**: tudo de autenticação fica em `features/auth/` do backoffice. A lib ganha só a entrada
`@canal/shared/files`, com a função de gerar o arquivo `.txt` movida do portal (princípio V). O simulador é o mesmo das
features 002 e 003.

## Decisões do usuário

- **Q1 (spec):** menu e rotas pelas permissões efetivas devolvidas pela API em `/me`; o BAUTH-05 do backlog do front
  foi ajustado.
- **Q2 (spec):** horários de expiração (inatividade e absoluta) vindos da API no `/me` e nas respostas do login.

## Premissas levadas ao backend

As premissas de contrato do login (próxima etapa em código, horários de expiração, bloqueio do desafio com código
próprio, QR code embutido e segredo, códigos de recuperação na confirmação, permissões e horários no `/me`) já estão no
backlog da API (`04-auth.md`, `03-users.md`). Faltam, em `contracts/auth-api.md`: o formato da lista de `abilities`, o
código `423` do bloqueio do desafio, os erros da troca de senha (`422` com código, inclusive `CURRENT_PASSWORD_INVALID`) e o QR code em PNG.

## Complexity Tracking

| Violation                                                                     | Why Needed                                                                                                                          | Simpler Alternative Rejected Because                                                                                             |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Tipos provisórios escritos à mão (`features/auth/auth.types.ts`), princípio V | As rotas de autenticação ainda não existem no `openapi/admin.json`; a feature roda contra o simulador (decisão do usuário, opção A) | Esperar o contrato atrasaria o backoffice inteiro; mesmo padrão aprovado nas features 001 a 003, com remoção em tarefa bloqueada |
