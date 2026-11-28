---
description: 'Lista de tarefas do acompanhamento da denúncia pelo portal (003-report-tracking)'
---

# Tasks: Acompanhamento da denúncia pelo portal (consulta, andamento, mensagens e saída segura)

**Input**: Design documents from `/specs/003-report-tracking/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are MANDATORY for every privacy, security, permission, encryption or audit rule (constitution,
principle VI). Nesta feature isso cobre URL, título, armazenamento, console, mensagem genérica da consulta, credencial
só nas rotas do denunciante, apagamento ao sair, expirar, receber 401, recarregar e voltar, "Equipe de apuração" sem
nome, datas sem hora, envio sem duplicar e o simulador fora do build. Os testes de cada história vêm **antes** da
implementação e precisam falhar primeiro. Nas regras de privacidade, usar também entradas curtas e casos de borda
(protocolo curto, chave de um caractere, mensagem com 1 e com 5.000 caracteres).

**Organization**: tarefas agrupadas por user story, para que cada uma possa ser implementada e testada sozinha.

**Bloqueios do backend**: tarefas marcadas com ⛔ só podem ser concluídas quando PUB-01, PUB-02, PUB-03, MSG-01 e
MSG-02 estiverem no contrato da API (`../canal-denuncias-api/openapi/public.json`). Até lá, ficam em aberto e não
impedem as outras.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: user story da spec (US1 a US3)
- Caminhos relativos à raiz do repositório `canal-denuncias-web`. `TRK` = `projects/portal/src/app/features/tracking`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: simulador pronto para as rotas de acompanhamento.

- [x] T001 Estender `tools/mock-api/server.mjs` com `POST /api/public/v1/tracking/sessions`, o guard simulado de
      `/api/public/v1/me/*`, `GET /me/report`, `GET /me/messages`, `POST /me/messages` e `POST /__mock/new-team-message`,
      com cenários, contadores e sentinelas conforme `specs/003-report-tracking/contracts/mock-api-tracking.md`
- [x] T002 [P] Testes do simulador em `tools/mock-api/server.test.mjs`: cada cenário, 401 sem token, com token de outra
      sessão e expirado, 409 que muda o relatório para `closed`, 400 sem repetir o corpo (texto curto `XQZ`),
      contadores, e nenhuma linha de log com protocolo, chave, token ou corpo
- [x] T003 [P] Estender `e2e/support/mock-api.ts` com os cenários `access`, `me`, `report`, `messages` e `send`, e com
      `newTeamMessage()`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos provisórios, chamadas, textos e ciclo de vida do acesso, usados pelas três histórias.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes (escrever antes e ver falhar)

- [x] T004 [P] Testes de `normalizeProtocol` em `TRK/normalize-protocol.spec.ts`: minúsculas, sem hífens, espaços nas
      pontas e no meio, hífens fora do lugar, texto curto e texto sem o prefixo (devolve limpo, sem lançar)
- [x] T005 [P] Testes de validação dos tipos provisórios em `TRK/tracking.types.spec.ts`: as quatro respostas válidas
      passam; campo faltando, tipo errado, status ou desfecho desconhecido e campo extra com nome de pessoa viram erro
      tratado, sem repetir o valor recebido
- [x] T006 [P] Testes de `TRK/tracking.api.spec.ts` com `HttpTestingController`: protocolo e chave só no corpo do
      `POST`, nunca na URL; `/me/*` com Bearer e a consulta sem Bearer; nenhum `withCredentials`
- [x] T007 [P] Testes de `ReporterAccess` em `TRK/reporter-access.spec.ts` com timers falsos: abrir guarda token e
      expiração na `ReporterSession`; `expiringSoon` liga em `expiresAt − 2 min` e na hora se faltar menos;
      encerramento aos 15 min, por 401 e por "Sair" limpa a sessão, cancela os temporizadores, navega para
      `/consultar` com `replaceUrl` e emite uma única mensagem; dois encerramentos seguidos não repetem a mensagem;
      `pageshow` com `persisted` encerra; `endReason` lido uma vez; resposta que chega depois do encerramento (outra
      geração de acesso) é descartada
- [x] T008 [P] Testes do guard em `TRK/reporter-access.guard.spec.ts`: sem credencial devolve a árvore de
      `/consultar`; com credencial permite

### Implementação

- [x] T009 [P] `TRK/normalize-protocol.ts` (research R7)
- [x] T010 [P] `TRK/tracking.types.ts`: tipos provisórios de `data-model.md` e validação em tempo de execução,
      marcados como provisórios até a T037 (research R2), e registrar no `AGENTS.md` que `tracking.types.ts` é exceção
      provisória à regra de tipos escritos à mão, a remover na T037 (analyze D1)
- [x] T011 [P] `TRK/tracking-labels.ts`: tabela código → texto de status e desfecho, com o padrão para código
      desconhecido (research R10)
- [x] T012 `TRK/tracking.api.ts`: as quatro chamadas com o prefixo `api:` e os tipos da T010 (depende de T010)
- [x] T013 `TRK/reporter-access.ts`: abrir, aviso, expirar, 401, sair, `pageshow`, `endReason` e geração de acesso
      (research R3, R5)
- [x] T014 `TRK/reporter-access.guard.ts` e `canActivate` de `/acompanhamento` em
      `projects/portal/src/app/app.routes.ts` (depende de T013)
- [x] T015 `projects/portal/src/app/api-policy.ts`: `onUnauthenticated` passa a chamar
      `ReporterAccess.end('expired')`, mantendo a regra de nunca navegar com dados na URL (depende de T013)

**Checkpoint**: base pronta; as histórias podem começar.

---

## Phase 3: User Story 1 - Consultar e ver andamento e desfecho (Priority: P1) 🎯 MVP

**Goal**: o denunciante abre o acesso com protocolo e chave e vê status, desfecho, prazo, categoria, data de
recebimento e linha do tempo, sem nada na URL e sem persistência.

**Independent Test**: com o simulador, consultar com dados válidos e inválidos e conferir a tela de andamento em cada
cenário de `report`; recarregar e conferir a volta para a consulta. Guardas de privacidade ativas nos dois navegadores.

### Testes (escrever antes e ver falhar)

- [x] T016 [P] [US1] e2e `e2e/portal/tracking-access.spec.ts`: protocolo `dv simul ado00` normalizado; chave oculta
      com botão de mostrar (`aria-pressed`); mensagem genérica idêntica para chave errada, `invalid` e `rate-limited`,
      anunciada e com os campos mantidos; clique duplo em "Consultar" faz uma só abertura (`stats.sessions`); sucesso
      leva a `/acompanhamento` com o foco no `h1`; nada na URL, no título ou no armazenamento
- [x] T017 [P] [US1] e2e `e2e/portal/tracking.spec.ts` (andamento): rótulo de cada cenário de `report`; desfecho dos
      três `concluded-*`; prazo em `awaiting` e "Prazo vencido" em `awaiting-overdue`; "Responder agora" move o foco
      para o campo de mensagem; linha do tempo só com datas; categoria e data de recebimento; nenhum texto de relato
- [x] T018 [P] [US1] Testes de componente em `TRK/tracking-access-page.spec.ts` e `TRK/tracking-status.spec.ts`: campos
      limpos depois do sucesso; status em texto (não só cor); desfecho ausente quando não concluída
- [x] T019 [P] [US1] Teste de `e2e/portal/tracking-session.spec.ts` (parte US1): recarregar `/acompanhamento` e abrir
      a rota direto sem acesso levam para a consulta, sem dados; URL colada com dados é ignorada

### Implementação

- [x] T020 [US1] `TRK/tracking-access-page.ts` substituindo o placeholder: formulário tipado, `ScreenState` da
      consulta, região de status, mensagem genérica, orientação de dispositivo pessoal (contracts/tracking-routes.md)
- [x] T021 [P] [US1] `TRK/tracking-status.ts`: status, desfecho, categoria, data de recebimento e bloco do prazo com
      "Responder agora"
- [x] T022 [P] [US1] `TRK/tracking-timeline.ts`: lista com data e status público
- [x] T023 [US1] `TRK/tracking-page.ts` substituindo o placeholder: `ScreenState<TrackingView>`, carregamento do
      andamento, `h1` com foco, composição de T021 e T022 (depende de T021, T022)
- [x] T024 [US1] Atualizar `e2e/portal/routes.ts` para abrir `/acompanhamento` com acesso simulado e incluir as duas
      telas nos testes de rota, título e console existentes

**Checkpoint**: US1 funcionando e testada sozinha.

---

## Phase 4: User Story 2 - Mensagens com a equipe (Priority: P1)

**Goal**: o denunciante lê e responde mensagens, busca novas só pelo botão "Atualizar", é avisado antes de expirar e
não escreve em denúncia encerrada.

**Independent Test**: com o simulador, ler, enviar, atualizar com mensagem nova, forçar 409, abrir denúncia encerrada e
avançar o relógio até o aviso.

### Testes (escrever antes e ver falhar)

- [x] T025 [P] [US2] e2e `e2e/portal/tracking.spec.ts` (mensagens): ordem cronológica; autor "Equipe de apuração" e
      "Você", sem nenhum nome; datas sem hora; envio com 1 e com 5.000 caracteres; 5.001 bloqueado com erro ligado ao
      campo; clique duplo em "Enviar" faz um só envio (`stats.messages`); texto mantido em erro; status volta para "Em
      análise" depois de responder em `awaiting`
- [x] T026 [P] [US2] e2e `e2e/portal/tracking.spec.ts` (atualizar e encerrada): "Atualizar" traz a mensagem de `newTeamMessage()` e anuncia "1 mensagem nova";
      nenhuma requisição de mensagens acontece sem o clique (contador do simulador estável com o relógio avançado);
      `send: closed` esconde o campo e mostra a explicação; `closed` e `concluded-*` mostram mensagens sem campo
- [x] T027 [P] [US2] e2e `e2e/portal/tracking-session.spec.ts` (aviso): com `page.clock`, a faixa aparece aos 13 min
      com `role="alert"`, sem tirar o foco do campo, e diz que o texto não enviado será perdido
- [x] T028 [P] [US2] Testes de componente em `TRK/tracking-messages.spec.ts` e `TRK/expiry-banner.spec.ts`: contador,
      botão desabilitado durante o envio, mensagem exibida por interpolação (texto com `<b>` aparece literal), lista
      vazia com a orientação

### Implementação

- [x] T029 [US2] `TRK/tracking-messages.ts`: lista (`ol`), "Atualizar" com região `aria-live`, campo com contador e
      `FormFieldError`, envio protegido contra clique duplo, recarga depois do envio e do 409, estado sem `canReply`
      (research R8, R9)
- [x] T030 [P] [US2] `TRK/expiry-banner.ts`: faixa não modal ligada a `ReporterAccess.expiringSoon` e `minutesLeft`
      (research R6)
- [x] T031 [US2] Integrar T029 e T030 em `TRK/tracking-page.ts` (depende de T023, T029, T030)

**Checkpoint**: US1 e US2 formam o MVP do acompanhamento.

---

## Phase 5: User Story 3 - Saída segura (Priority: P2)

**Goal**: "Sair" em toda a tela; sair, expirar e 401 apagam tudo; o voltar do navegador não mostra nada.

**Independent Test**: abrir o acompanhamento, sair e voltar; expirar; receber 401; conferir a consulta com a mensagem e
nenhum dado.

### Testes (escrever antes e ver falhar)

- [ ] T032 [P] [US3] e2e `e2e/portal/tracking-session.spec.ts` (saída): "Sair" no topo e no fim; sair mostra "Você saiu
      do acompanhamento." e o voltar do navegador continua na consulta sem dados; `page.clock` até 15 min volta para a
      consulta com "Seu acesso terminou…" e apaga o texto em digitação; `me: unauthorized` faz o mesmo; uma única
      mensagem em cada caso; envio `slow` com o relógio avançado até a expiração não mostra a mensagem enviada nem volta para o
      acompanhamento (analyze C1)
- [ ] T033 [P] [US3] e2e `e2e/portal/tracking-session.spec.ts`: orientações para computador compartilhado nas duas telas; duas abas com acessos
      independentes (sair numa não afeta a outra)

### Implementação

- [ ] T034 [US3] Botões "Sair" no topo e no fim de `TRK/tracking-page.ts`, ligados a `ReporterAccess.end('logout')`,
      e bloco de orientações (contracts/tracking-routes.md)
- [ ] T035 [US3] Mensagens de encerramento na `TRK/tracking-access-page.ts` em `role="status"`, lidas de
      `ReporterAccess.endReason` (único mecanismo, sem snackbar)

**Checkpoint**: as três histórias funcionando e testadas.

---

## Phase 6: Integração com a API (bloqueada)

- [ ] T036 ⛔ PUB-01, PUB-03, MSG-01, MSG-02: `npm run api:sync` e `npm run api:generate` e conferência de que as
      quatro rotas existem em `projects/shared/src/lib/api/generated/`
- [ ] T037 ⛔ Trocar `TRK/tracking.types.ts` e as chamadas de `TRK/tracking.api.ts` pelo cliente gerado, apagar o
      arquivo de tipos provisórios e a linha do Complexity Tracking em `specs/003-report-tracking/plan.md`
- [ ] T038 ⛔ Conferir as respostas do simulador contra `openapi/public.json` (incluindo `canReply`, códigos de status
      e desfecho e as datas sem hora do MSG-02) em `tools/mock-api/contract.test.mjs`, e ajustar
      `TRK/tracking-labels.ts` se os códigos reais forem outros
- [ ] T039 ⛔ Rodar os e2e das três histórias contra a API real (compose da API) e registrar o resultado em
      `docs/validacoes/integracao.md`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T040 [P] Acessibilidade: incluir `/consultar` e `/acompanhamento` (com acesso simulado) em
      `e2e/portal/a11y.spec.ts` e em `e2e/portal/layout.spec.ts` (320 px e zoom de 200%), e um percurso só com teclado
      (consultar, responder, sair) em `e2e/portal/tracking-session.spec.ts`
- [ ] T041 [P] Medir o bundle (inicial e chunks da feature) e registrar no `specs/003-report-tracking/plan.md` (meta:
      até +3 kB no inicial, até 60 kB lazy)
- [ ] T042 [P] Atualizar `AGENTS.md` e `README.md`: `ReporterAccess` como único ponto de encerramento, cenários novos do
      simulador, tipos provisórios do acompanhamento
- [ ] T043 [P] Marcar os critérios atendidos em `docs/tarefas/02-portal-protocolo-e-consulta.md` e
      `docs/tarefas/03-portal-acompanhamento.md`, com a nota de que foram validados contra o simulador
- [ ] T044 Seguir `specs/003-report-tracking/quickstart.md` e fazer a verificação final (lint, `lint:rules`,
      unitários, `test:scripts`, build, `check:build`, `api:check`, e2e)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; bloqueia as histórias.
- **US1 (Phase 3)**: depende da Phase 2.
- **US2 (Phase 4)**: depende da Phase 2; a integração na tela (T031) depende da T023 da US1. Os testes e componentes
  da US2 (T025–T030) podem começar junto com a US1.
- **US3 (Phase 5)**: depende da Phase 2 e da T023 (tela de acompanhamento).
- **Integração (Phase 6)**: bloqueada pela API; não bloqueia nada.
- **Polish (Phase 7)**: depois das histórias.

### Within Each User Story

- Testes antes, falhando primeiro.
- Tipos e chamadas antes das telas; componentes antes da composição na tela.
- Commit por fase ou história, com tudo verde.

### Parallel Opportunities

- Setup: T002 e T003 depois da T001.
- Foundational: todos os testes (T004–T008) juntos; T009, T010 e T011 juntos.
- US1: testes T016–T019 juntos; T021 e T022 juntos.
- US2: testes T025–T028 juntos; T030 em paralelo com T029.
- US3: T032 e T033 juntos.
- Polish: T040–T043 juntos.

---

## Parallel Example: User Story 1

```bash
Task: "e2e da consulta em e2e/portal/tracking-access.spec.ts"
Task: "e2e do andamento em e2e/portal/tracking.spec.ts"
Task: "testes de componente da consulta e do status"
Task: "e2e de recarga e rota direta em e2e/portal/tracking-session.spec.ts"
```

---

## Implementation Strategy

### MVP First

1. Setup e Foundational.
2. US1: validar consulta e andamento no e2e.
3. US2: validar mensagens e aviso. US1 e US2 juntas formam o MVP do acompanhamento.

### Incremental Delivery

1. Base pronta → US1 → validar → US2 → validar (MVP) → US3 → Polish.
2. Quando a API publicar PUB-01 a PUB-03, MSG-01 e MSG-02, rodar a Phase 6.

---

## Notes

- Nenhum texto de mensagem, protocolo, chave ou token pode aparecer em log de teste, relatório do Playwright ou
  mensagem de asserção: os testes conferem ausência, não imprimem o valor.
- A US3 é P2, mas obrigatória para o MVP do portal (spec): sem ela, um computador compartilhado expõe a denúncia.

---

## Pendências do analyze

- **C2** (aberta): SC-001 (chegar ao andamento em menos de 1 minuto, sem ajuda) entra como validação manual na seção 4
  do `quickstart.md` (T044).
- **C3** (aberta): incluir o cenário `access: error` (5xx) na T016, mantendo protocolo e chave nos campos.
- **U1** (aberta): a restauração pelo cache de navegação (`pageshow` com `persisted`) só tem teste unitário (T007);
  registrar a limitação em `docs/validacoes/` no Polish.
