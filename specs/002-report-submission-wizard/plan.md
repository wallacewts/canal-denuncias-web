# Implementation Plan: Envio de denúncia pelo portal (wizard, início e protocolo)

**Branch**: `main` (sem branch de feature, decisão do usuário) | **Date**: 2026-11-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-report-submission-wizard/spec.md`

## Summary

O portal ganha o fluxo completo de envio: página inicial (PINF-01), wizard com tipo de denunciante, categoria, relato e
envolvidos (PNEW-01 a PNEW-05), revisão e envio (PNEW-06) e tela do protocolo (PACC-01). O rascunho e o comprovante
vivem só em memória, num componente-pai de fluxo que os descarta ao sair, com aviso de saída e descarte por
inatividade (30 min, aviso aos 25). Como os endpoints da API ainda não existem (opção A), a feature usa um servidor
simulado fora do código dos apps, no e2e e no desenvolvimento, e o build de produção é verificado para provar que nada
simulado entrou. A integração com o cliente gerado fica bloqueada até CAT-01 e REP-02 saírem no contrato.

## Technical Context

**Language/Version**: TypeScript 6, Angular 22.3 (standalone, zoneless, signals)

**Primary Dependencies**: Angular Material 22.3 (form-field, input, radio, checkbox, button, dialog já usado pela lib);
lib `@canal/shared` da feature 001. Nenhuma dependência nova de runtime. Nenhuma dependência nova de desenvolvimento.

**Storage**: N/A. Tudo em memória (data-model.md).

**Testing**: Vitest (unitários, com `HttpTestingController` e timers falsos); Playwright 1.65.1 no container oficial,
Chromium e Firefox, com `privacyGuards`, axe e `page.clock` (e2e); `node --test` para os scripts.

**Target Platform**: navegadores atuais (Chromium e Firefox nos testes), servido por nginx com CSP com nonce e Trusted
Types.

**Project Type**: aplicação web (workspace Angular: app `portal`, lib `shared`).

**Performance Goals**: envio completo com descrição mínima em menos de 5 minutos para a pessoa (SC-001); telas
carregadas sob demanda.

**Constraints**: bundle inicial do portal com aviso em 440 kB e erro em 500 kB (decisão do usuário em 2026-11-28; antes
o aviso era 400 kB). Medido na US1: 413,5 kB (103 kB comprimido; era 367,6 kB e 91 kB). O código da feature fica todo em
chunks lazy; o aumento é runtime compartilhado (ver Complexity Tracking). Nada no armazenamento do navegador, na URL, no título ou no console. CSP e Trusted Types
intactas.

**Scale/Scope**: 7 telas (início, 4 etapas, revisão, protocolo) e um diálogo de aviso de privacidade.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Confira cada portão contra `.specify/memory/constitution.md`. Marque ✅ ou explique a violação em "Complexity Tracking".

**Antes da pesquisa**

- [x] I. Anonimato: rascunho, protocolo e chave só em memória; URL só com o nome da etapa; arquivo baixado com nome
      fixo; nenhuma requisição externa. Chave exibida uma única vez (spec FR-001, FR-029 a FR-035).
- [x] II. Navegador: nenhuma mudança na CSP; o download usa `Blob` e âncora (sem sink de Trusted Types); sem
      `innerHTML`. O portal segue sem cookies (D39).
- [x] III. Fronteira: a validação no navegador repete os limites de REP-02 só como conveniência; a API valida de novo.
      Nenhuma regra de permissão no front (rotas públicas).
- [x] IV. Acessibilidade: progresso anunciado, foco no título, erros ligados ao campo, teclado em tudo; axe, zoom de
      200% e 320 px em todas as telas novas.
- [ ] V. Padrões Angular: standalone, signals, zoneless, lazy loading e Reactive Forms tipados ✅. **Cliente gerado**:
      os endpoints ainda não existem no contrato; tipos provisórios até lá (ver Complexity Tracking).
- [x] VI. Testes: cada regra de privacidade com teste que falha se quebrar (URL, armazenamento, console, título,
      nome do arquivo, descarte ao sair e por inatividade); e2e do fluxo completo.
- [x] VII. Qualidade: lint, testes, build, `check:build` e e2e verdes; orçamento respeitado (R12).
- [x] VIII. Simplicidade: só as tarefas da feature; nenhuma dependência nova; anexos e identificação fora.

**Depois do design (Phase 1)**

- [x] I. O simulador fica em `tools/`, nunca importado pelos apps (lint), e o `check:build` reprova sentinelas dele no
      build (R1). Os títulos das rotas foram conferidos (contracts/wizard-routes.md).
- [x] II. Download e cópia revisados contra a CSP (R7, R11); diálogo de privacidade usa o `MatDialog` já carregado
      sob demanda.
- [x] III. Sem mudança.
- [x] IV. Sem o datepicker do Material: controles nativos acessíveis (R9).
- [ ] V. Mantida a exceção dos tipos provisórios, com remoção prevista (R2).
- [x] VI. Cenários do simulador cobrem erro, lista vazia, validação e lentidão; `page.clock` cobre a inatividade.
- [x] VII. Meta de bundle definida e medida em cada fase.
- [x] VIII. Sem mudança.

## Project Structure

### Documentation (this feature)

```text
specs/002-report-submission-wizard/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── mock-api.md
│   └── wizard-routes.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
projects/portal/src/app/
├── app.routes.ts                          # rota-pai /nova-denuncia; anexos e identificação saem
└── features/
    ├── home/home-page.ts                  # PINF-01
    ├── privacy/
    │   ├── privacy-notice-page.ts         # passa a usar o conteúdo compartilhado
    │   └── privacy-notice-content.ts      # novo: texto do aviso (página e diálogo)
    └── new-report/
        ├── new-report-flow.ts             # novo: rota-pai, provê os estados, etapas puladas, beforeunload
        ├── new-report-flow.guards.ts      # novo: canDeactivate do fluxo e do protocolo
        ├── wizard-steps.ts                # novo: tabela única de etapas
        ├── wizard-progress.ts             # novo: indicador de progresso
        ├── report-draft.state.ts          # novo: FormGroup tipado do rascunho
        ├── receipt.state.ts               # novo: comprovante em memória
        ├── inactivity-timer.ts            # novo: 25/30 min
        ├── report-submission.api.ts       # novo: chamadas com tipos provisórios (troca pelo gerado depois)
        ├── report-submission.types.ts     # novo: tipos provisórios e validação em tempo de execução
        ├── to-submission.ts               # novo: monta o corpo do envio
        ├── receipt-file.ts                # novo: gera e baixa o .txt
        ├── steps/                         # 4 etapas; attachments-step e identification-step saem
        ├── review-page.ts
        └── protocol-issued-page.ts
tools/mock-api/server.mjs                  # novo: simulador (absorve e2e/support/echo-api.mjs)
scripts/check-build-output.mjs             # + sentinelas do simulador
e2e/portal/
├── routes.ts                              # sem anexos e identificação
├── new-report.spec.ts                     # novo: fluxo, erros, clique duplo, saídas, download, inatividade
└── a11y.spec.ts                           # + telas novas com o fluxo preenchido
docker-compose.e2e.yml                     # upstream /api -> tools/mock-api
```

**Structure Decision**: o código fica no app `portal`, dentro de `features/new-report`, porque só o portal usa o
fluxo. Nada vai para a lib `shared`, exceto se uma peça for reaproveitada pelo backoffice (não é o caso agora). O
simulador fica em `tools/`, fora de `projects/`, para não poder ser importado pelos apps.

## Decisões confirmadas

- **Inatividade na tela do protocolo** (Q-P1, respondida em 2026-11-28): a regra de 30 minutos, com aviso aos 25, vale
  também para a tela do protocolo. Aos 30 minutos, protocolo e chave são apagados e a tela mostra só o aviso.

## Complexity Tracking

| Violation                                                                                                                                 | Why Needed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Simpler Alternative Rejected Because                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Aviso do orçamento do bundle inicial do portal de 400 kB para 440 kB (princípio VII: o inicial não cresce sem justificativa)              | O esbuild atribui cada arquivo de biblioteca a um único chunk. Partes do runtime que só as telas novas usam (`@angular/core`, `@angular/common`, `@angular/cdk/a11y`) vão para o `main`, que já carrega esses arquivos. Medido: o `MatDialog` do aviso de privacidade soma 11 kB, o `formatDate` da data do protocolo soma 11 kB, e o `ConfirmDialog` da US2 leva o inicial a ~402 kB mesmo sem os dois. Inicial: 367,6 → 413,5 kB; comprimido: 91 → 103 kB. O otimizador de chunks do Angular (`NG_BUILD_OPTIMIZE_CHUNKS`) não reduziu | Evitar `MatDialog`, `formatDate` e `ConfirmDialog` (bloco `<details>`, data formatada à mão e `<dialog>` nativo) ficaria em ~392 kB, mas fugiria dos componentes padrão da lib, e o custo voltaria nas próximas features (acompanhamento com datas). O erro continua em 500 kB |
| Tipos provisórios (`ProvisionalCategory`, `ProvisionalReportSubmission`, `ProvisionalReportReceipt`) escritos à mão, contra o princípio V | Os endpoints CAT-01 e REP-02 ainda não existem no contrato da API (opção A do usuário). Validação em tempo de execução protege contra respostas inesperadas                                                                                                                                                                                                                                                                                                                                                                             | Esperar a API foi descartado pelo usuário; escrever as rotas no contrato à mão é proibido (o contrato é gerado pela API). Uma tarefa bloqueada remove os provisórios quando os endpoints saírem, como o `ProvisionalApiError` da feature 001                                   |
