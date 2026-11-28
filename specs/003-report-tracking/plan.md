# Implementation Plan: Acompanhamento da denúncia pelo portal (consulta, andamento, mensagens e saída segura)

**Branch**: `main` (sem branch de feature, decisão do usuário) | **Date**: 2026-11-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-report-tracking/spec.md`

## Summary

O portal ganha a volta do denunciante: consulta com protocolo e chave (PACC-02), acesso só em memória com expiração de
15 minutos, aviso aos 13 e encerramento por 401 ou "Sair" (PACC-03, PTRK-04), tela de andamento com status público,
desfecho, prazo e linha do tempo (PTRK-01) e conversa com a "Equipe de apuração" (PTRK-02), com mensagens buscadas só
pelo botão "Atualizar" e datas sem hora. Como PUB-01 a PUB-03, MSG-01 e MSG-02 ainda não existem na API, a feature
estende o servidor simulado da 002, com tipos provisórios e validação em tempo de execução; a integração com o cliente
gerado fica bloqueada até os endpoints saírem no contrato.

## Technical Context

**Language/Version**: TypeScript 6, Angular 22.3 (standalone, zoneless, signals)

**Primary Dependencies**: Angular Material 22.3 (form-field, input e button, já usados); lib `@canal/shared`
(`ReporterSession`, `ScreenState`, `FormFieldError`, `PortalDatePipe`, `NotificationService`, política de credenciais).
Nenhuma dependência nova de runtime ou de desenvolvimento.

**Storage**: N/A. Tudo em memória (data-model.md).

**Testing**: Vitest (unitários, com `HttpTestingController` e timers falsos); Playwright 1.65.1 no container oficial,
Chromium e Firefox, com `privacyGuards`, axe e `page.clock` (e2e); `node --test` para o simulador.

**Target Platform**: navegadores atuais (Chromium e Firefox nos testes), servido por nginx com CSP com nonce e Trusted
Types.

**Project Type**: aplicação web (workspace Angular: app `portal`, lib `shared`).

**Performance Goals**: chegar ao andamento em menos de 1 minuto com protocolo e chave em mãos (SC-001); telas
carregadas sob demanda.

**Constraints**: bundle inicial do portal com aviso em 440 kB e erro em 500 kB (D52); hoje 413,4 kB. Meta desta
feature: até +3 kB no inicial e até 60 kB nos chunks lazy (research R11). Nada no armazenamento do navegador, na URL,
no título ou no console. CSP e Trusted Types intactas. Credencial só em `/public/v1/me/*` (D39).

**Scale/Scope**: 2 telas (consulta e acompanhamento), 1 serviço de ciclo de vida, 4 rotas novas no simulador.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Confira cada portão contra `.specify/memory/constitution.md`. Marque ✅ ou explique a violação em "Complexity Tracking".

**Antes da pesquisa**

- [x] I. Anonimato: protocolo, chave, credencial, andamento e mensagens só em memória; URL só com `/consultar` e
      `/acompanhamento`; nenhuma requisição externa; "Equipe de apuração" sem nome; datas sem hora (spec FR-003, FR-007,
      FR-014, FR-017, FR-018).
- [x] II. Navegador: nenhuma mudança na CSP nem nos cabeçalhos; mensagens exibidas por interpolação (sem `innerHTML`);
      o portal segue sem cookies e a credencial vai como Bearer só nas rotas do denunciante (D39).
- [x] III. Fronteira: a API decide acesso, status público, desfecho e se a pessoa pode responder (`canReply`, R9); o
      portal só traduz códigos em textos (R10) e repete o limite de 5.000 caracteres como conveniência.
- [x] IV. Acessibilidade: erro genérico anunciado, contador e erro ligados ao campo, mensagens novas e aviso de
      expiração anunciados, status em texto, foco no título, fluxo só com teclado, 320 px e zoom de 200%.
- [ ] V. Padrões Angular: standalone, signals, zoneless, lazy loading e Reactive Forms tipados ✅. **Cliente gerado**:
      os endpoints ainda não existem no contrato; tipos provisórios até lá (ver Complexity Tracking).
- [x] VI. Testes: cada regra de privacidade com teste que falha se quebrar (URL, título, armazenamento, console,
      mensagem genérica, apagamento ao sair, expirar, 401 e voltar); e2e das três histórias.
- [x] VII. Qualidade: lint, testes, build, `check:build`, `api:check` e e2e verdes; orçamento respeitado (R11).
- [x] VIII. Simplicidade: só as tarefas da etapa 3; nenhuma dependência nova; PACC-04 e PTRK-03 fora.

**Depois do design (Phase 1)**

- [x] I. O simulador fica em `tools/`, nunca importado pelos apps; token, protocolo e categoria simulados usam as
      sentinelas que o `check:build` reprova (R1). Títulos das rotas conferidos (contracts/tracking-routes.md).
      Restauração pelo cache de navegação coberta pelo `pageshow` (R5).
- [x] II. Faixa de expiração e mensagens sem sink de Trusted Types; nenhum componente novo que injete estilo além dos
      já validados.
- [x] III. `canReply` proposto ao backend para não copiar a regra do MSG-01 (R9); rótulos derivados de códigos
      públicos (R10).
- [x] IV. Aviso de expiração não modal, para não tirar o foco da digitação (R6).
- [ ] V. Mantida a exceção dos tipos provisórios, com remoção prevista (R2).
- [x] VI. Cenários do simulador cobrem cada status, 401, 409, 429, erro, lentidão e mensagem nova; `page.clock` cobre
      aviso e expiração.
- [x] VII. Meta de bundle definida e medida em cada fase.
- [x] VIII. Sem mudança.

## Project Structure

### Documentation (this feature)

```text
specs/003-report-tracking/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── mock-api-tracking.md
│   └── tracking-routes.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
projects/portal/src/app/
├── app.routes.ts                          # canActivate em /acompanhamento
├── api-policy.ts                          # onUnauthenticated passa a usar ReporterAccess.end('expired')
└── features/tracking/
    ├── reporter-access.ts                 # novo: abrir, aviso aos 13 min, expirar, 401, sair, pageshow
    ├── reporter-access.guard.ts           # novo: canActivate de /acompanhamento
    ├── normalize-protocol.ts              # novo: função pura
    ├── tracking.types.ts                  # novo: tipos provisórios + validação em tempo de execução (R2)
    ├── tracking.api.ts                    # novo: chamadas das 4 rotas com os tipos provisórios
    ├── tracking-labels.ts                 # novo: código público → texto (R10)
    ├── tracking-access-page.ts            # substitui o placeholder (PACC-02)
    ├── tracking-page.ts                   # substitui o placeholder (PTRK-01, PTRK-02, PTRK-04)
    ├── tracking-status.ts                 # novo: bloco de andamento, desfecho e prazo
    ├── tracking-timeline.ts               # novo: linha do tempo
    ├── tracking-messages.ts               # novo: lista, Atualizar e resposta
    └── expiry-banner.ts                   # novo: faixa de expiração (R6)
tools/mock-api/
├── server.mjs                             # + rotas de acompanhamento e guard simulado (R1)
└── server.test.mjs                        # + testes das novas rotas
e2e/portal/
├── routes.ts                              # /consultar e /acompanhamento com acesso simulado
├── tracking-access.spec.ts                # novo: normalização, mensagem genérica, clique duplo
├── tracking.spec.ts                       # novo: status, desfecho, prazo, mensagens, Atualizar, 409
├── tracking-session.spec.ts               # novo: aviso, expiração, 401, sair, voltar, recarga
├── tracking-helpers.ts                    # novo: abrir acesso simulado
├── layout.spec.ts                         # + telas novas em 320 px e zoom de 200%
└── a11y.spec.ts                           # + telas novas
e2e/support/mock-api.ts                    # + cenários de acompanhamento
```

**Structure Decision**: tudo do acompanhamento fica em `features/tracking/` do portal; a lib não muda (a
`ReporterSession` continua mínima e o ciclo de vida é do portal, research R3). O simulador é o mesmo da 002.

## Complexity Tracking

| Violation                                                                  | Why Needed                                                                                                                          | Simpler Alternative Rejected Because                                                                                                                                                    |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tipos de resposta da API escritos à mão (`tracking.types.ts`), princípio V | PUB-01 a PUB-03, MSG-01 e MSG-02 ainda não existem no contrato; o usuário escolheu seguir com o simulador (mesma estratégia da 002) | Esperar os endpoints pararia o front por várias features. A exceção tem validação em tempo de execução e uma tarefa bloqueada que troca os tipos pelo cliente gerado e remove o arquivo |

## Premissas levadas ao backend

- **`canReply` em PUB-03** (research R9): a resposta do andamento informa se a pessoa pode responder, para o portal não
  copiar a regra do MSG-01. A integração (tarefa bloqueada) confere.
- **MSG-02 com só a data** (Q2 = A): ajuste feito pelo agente do backend no backlog da API.
- **Status público em código** (research R10): PUB-03 devolve `RECEIVED`, `IN_REVIEW`, `AWAITING_REPORTER`, `CLOSED`
  e `CONCLUDED`, e o desfecho em código. Se o contrato real usar outros nomes, a troca fica restrita à tabela de textos
  e aos tipos.
- **Autor da mensagem em código no MSG-02** (analyze I1): `author` vem como `REPORTER` ou `TEAM`, e o portal escreve
  "Você" e "Equipe de apuração". A T038 confere no contrato.
- **`expiresAt` no corpo do PUB-01** (analyze I2): a abertura de acesso devolve `{ token, expiresAt }`, com
  `expiresAt` em ISO 8601. O aviso e a expiração do portal dependem dele. A T038 confere no contrato.
