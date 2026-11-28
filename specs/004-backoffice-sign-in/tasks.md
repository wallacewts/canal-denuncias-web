---
description: 'Lista de tarefas do acesso da equipe ao backoffice (004-backoffice-sign-in)'
---

# Tasks: Acesso da equipe ao backoffice (login com segundo fator, primeiro acesso, permissões, expiração e perfil)

**Input**: Design documents from `/specs/004-backoffice-sign-in/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are MANDATORY for every privacy, security, permission, encryption or audit rule (constitution,
principle VI). Nesta feature isso cobre: mensagem genérica idêntica na etapa da senha (inclusive conta bloqueada,
desativada e 429), nenhum token no front, segredo e códigos de recuperação exibidos uma vez e apagados ao sair, nada em
URL, armazenamento ou console, caminho de retorno só em memória e só interno, memória limpa em cada encerramento, menu e
rotas só pelas permissões da API, escrita de outra origem recusada e o simulador fora do build. Os testes de cada
história vêm **antes** da implementação e precisam falhar primeiro. Nas regras de privacidade, usar também entradas
curtas e casos de borda (senha de 1 caractere, e-mail curto `a@b`, código de 5 dígitos, segredo curto `XQZ`).

**Organization**: tarefas agrupadas por user story, para que cada uma possa ser implementada e testada sozinha.

**Bloqueios do backend**: tarefas marcadas com ⛔ só podem ser concluídas quando AUTH-01 a AUTH-07 e USERS-07 estiverem
no contrato da API (`../canal-denuncias-api/openapi/admin.json`). Até lá, ficam em aberto e não impedem as outras.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: user story da spec (US1 a US5)
- Caminhos relativos à raiz do repositório `canal-denuncias-web`. `AUTH` = `projects/backoffice/src/app/features/auth`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: simulador pronto para as rotas de autenticação e o proxy do backoffice correto.

- [x] T001 Estender `tools/mock-api/server.mjs` com `POST /api/admin/v1/auth/sign-in`, `/auth/mfa/challenge`,
      `/auth/mfa/enrollment`, `/auth/mfa/enrollment/confirmation`, `/auth/sign-out`, `GET /api/admin/v1/me` e
      `PUT /api/admin/v1/me/password`, com contas e cenários de `specs/004-backoffice-sign-in/contracts/auth-api.md`
      (inclusive `bloqueada` e `sign-in: rate-limited` com a mesma resposta genérica da senha errada), cookie `sid`
      `HttpOnly`/`SameSite=Strict` sem `Secure`, relógio controlado para os horários, sentinelas e nenhum corpo no log
- [x] T002 [P] Testes do simulador em `tools/mock-api/server.test.mjs`: cada rota e cenário, 401 genérico idêntico para
      e-mail inexistente, senha errada, `bloqueada` e `desativada`, 429 de `rate-limited`, 423 do desafio bloqueado,
      sessão pendente fora das rotas de etapa, cookie novo depois do desafio, e proteção por origem (escrita com
      `Sec-Fetch-Site: cross-site` → 403; sem o cabeçalho e com `Origin` diferente do host → 403; mesma origem → passa)
- [x] T003 [P] Cenários de autenticação no helper `e2e/support/mock-api.ts` (contas, `challenge`, `password`,
      `sign-in`, `me: expired`, avanço do relógio do simulador)
- [x] T004 [P] `proxy_set_header Host $host` no `location /api/` de `docker/nginx/backoffice.conf.template`, e
      `e2e/backoffice/proxy.spec.ts` conferindo no servidor de eco que `Host`, `Origin` e `Sec-Fetch-Site` chegam ao
      upstream (research R9)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: estado da sessão, tipos provisórios, chamadas, política e guards que todas as histórias usam.

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase.

### Testes (escrever antes e ver falhar)

- [x] T005 [P] Unitário de `AUTH/auth.types.spec.ts`: validação em tempo de execução de cada resposta do contrato
      (próxima etapa, horários ISO, `CurrentUser`, cadastro com QR code só em `data:image/png;base64`, 10 códigos);
      SVG embutido e campos extras recusados
- [x] T006 [P] Unitário de `AUTH/staff-session.spec.ts`: restaurar por `/me`; `end(reason)` idempotente limpa usuário,
      permissões, horários e retorno; avisa outras abas exceto em `other-tab`; ignora respostas depois do encerramento;
      janela de inatividade derivada da resposta (sem 15 min fixo); margem de 60 s; correção pelo cabeçalho `Date`
- [x] T007 [P] Unitário de `AUTH/auth.guards.spec.ts`: sem sessão → `/login` com retorno em memória (nunca na URL);
      retorno só interno (`//x`, `https://...`, `/login` recusados); sessão restaurada por `/me`; `permissionGuard`
      nega sem a `ability` e libera com ela; rota sem `ability` só exige sessão;
      com etapa pendente em memória (sem recarga), rota interna leva à etapa; depois de recarregar (`/me` 401 da sessão
      pendente), vai ao login (FR-012)
- [x] T008 [P] Unitário de `AUTH/activity.interceptor.spec.ts`: só respostas 2xx de `/api/admin` marcam atividade;
      erro e chamada pública não marcam
- [x] T009 [P] Unitário de `projects/backoffice/src/app/api-policy.spec.ts`: 401 silencioso chama
      `StaffSession.end('unauthenticated')`, sem mensagem padrão do `errorInterceptor`

### Implementação

- [x] T010 [P] Tipos provisórios e validação em `AUTH/auth.types.ts` (exceção do Complexity Tracking; linha no
      `AGENTS.md` junto com esta tarefa)
- [x] T011 [P] Chamadas das rotas de autenticação e de `/me` em `AUTH/auth.api.ts`, com `API_CALLER_HANDLES` por tela
      (importado de `@canal/shared/http`)
- [x] T012 `AUTH/staff-session.ts`: estado em memória, horários, temporizadores de aviso, `end(reason)`,
      `BroadcastChannel('canal-backoffice-session')` com eventos `activity` e `ended` (research R1 a R3)
- [x] T013 `AUTH/auth.guards.ts` (`authGuard` com `canActivate`/`canActivateChild` e `permissionGuard`) e
      `AUTH/access-denied.ts`
- [x] T014 [P] `AUTH/activity.interceptor.ts` registrado em `projects/backoffice/src/app/app.config.ts`
- [x] T015 Política do backoffice em `projects/backoffice/src/app/api-policy.ts`: `silentUnauthenticated: true` e
      `onUnauthenticated` → `StaffSession.end('unauthenticated')`
- [x] T016 Rotas em `projects/backoffice/src/app/app.routes.ts`: fluxo de entrada fora do `Shell`, `authGuard` no
      `Shell` (resolve o TODO da feature 001) e `data.ability` conforme `contracts/auth-routes.md`
- [x] T017 Atualizar `e2e/backoffice/routes.spec.ts` e `e2e/backoffice/routes.ts`: com o guard, as rotas internas
      exigem sessão; o teste entra pelo simulador (conta `pronta`) antes de visitar cada rota interna e mantém `/login`
      aberta, para os e2e da feature 001 continuarem verdes
- [x] T018 [P] Extrair a geração do arquivo `.txt` para `projects/shared/src/lib/files/text-file.ts` com a entrada
      secundária `projects/shared/src/files.ts` (`@canal/shared/files`, path no `tsconfig.json`), mover os testes de
      `projects/portal/src/app/features/new-report/receipt-file.spec.ts` e fazer o portal importar de lá, sem mudança de
      comportamento (research R7)

**Checkpoint**: sessão, guards e simulador prontos; as histórias podem começar.

---

## Phase 3: User Story 1 - Entrar com senha e segundo fator (Priority: P1) 🎯 MVP

**Goal**: entrada com e-mail, senha e código do autenticador (ou de recuperação), com mensagem genérica idêntica para
qualquer falha da etapa da senha.

**Independent Test**: conta `pronta` entra e chega ao painel; senha errada, e-mail inexistente, `bloqueada`,
`desativada` e `rate-limited` mostram exatamente a mesma mensagem; código errado e desafio bloqueado têm mensagens
próprias.

### Testes (escrever antes e ver falhar)

- [x] T019 [P] [US1] Unitário de `AUTH/sign-in-flow.spec.ts`: etapa vinda da API decide a rota; pular etapa pelo
      endereço → `replaceUrl`; clique duplo → uma chamada
- [x] T020 [P] [US1] Unitário de `AUTH/login-page.spec.ts`: 401 e 429 com a mesma mensagem e o mesmo estado da tela;
      senha limpa depois de cada envio; e-mail mantido; mensagem de encerramento lida do `StaffSession` e limpa
- [x] T021 [P] [US1] Unitário de `AUTH/mfa-challenge-page.spec.ts`: código e código de recuperação; 401 genérico; 423
      com mensagem de bloqueio sem motivo; sessão pendente expirada volta ao login; `autocomplete="one-time-code"` e
      `inputmode="numeric"`
- [x] T022 [P] [US1] E2E em `e2e/backoffice/sign-in.spec.ts`: entrada completa até o painel; mensagens idênticas para
      as cinco falhas da etapa da senha (comparando texto e estado da tela); código de recuperação; desafio bloqueado;
      nenhum token na resposta lido pelo front, nada em URL/armazenamento/console (`privacyGuards`)

### Implementação

- [x] T023 [US1] `AUTH/sign-in-flow.ts` (escopo do componente-pai `/login`)
- [x] T024 [US1] `AUTH/login-page.ts` (substitui o placeholder): e-mail e senha, mensagem genérica, região `role="status"`
      para o motivo do encerramento
- [x] T025 [US1] `AUTH/mfa-challenge-page.ts`: código de seis dígitos, "Usar um código de recuperação", bloqueio,
      `DONE` carrega `/me` e vai para o caminho de retorno

**Checkpoint**: a equipe com segundo fator já cadastrado entra no backoffice.

---

## Phase 4: User Story 2 - Primeiro acesso (Priority: P1)

**Goal**: troca da senha provisória, cadastro do autenticador e códigos de recuperação exibidos uma única vez.

**Independent Test**: conta `primeiro-acesso` troca a senha, cadastra o autenticador, guarda os códigos e chega ao
painel; segredo e códigos não aparecem em URL, armazenamento ou console e não reaparecem ao voltar ou recarregar.

### Testes (escrever antes e ver falhar)

- [ ] T026 [P] [US2] Unitário de `AUTH/password-change-form.spec.ts`: política exibida; tamanho mínimo e confirmação
      validados antes do envio (senha de 1 e de 11 caracteres); 422 com motivo (`PASSWORD_COMMON`, `PASSWORD_TOO_SHORT`); 422 `CURRENT_PASSWORD_INVALID` como erro no campo da senha atual, sem encerrar a sessão (401 só
      encerra quando a sessão expirou); 429 depois de 5 erros encerra pela `StaffSession`; campos limpos depois de cada envio
- [ ] T027 [P] [US2] Unitário de `AUTH/mfa-enrollment-page.spec.ts`: QR code só PNG embutido no `<img>` (SVG recusado),
      segredo em blocos de 4, código inválido não ativa, código válido leva aos códigos; estado apagado ao destruir
- [ ] T028 [P] [US2] Unitário de `AUTH/recovery-codes-page.spec.ts`: 10 códigos, "Continuar" só depois de "Guardei",
      copiar com fallback, arquivo com nome fixo; ao destruir, códigos apagados; recarga mostra "já exibidos"
- [ ] T029 [P] [US2] E2E em `e2e/backoffice/first-access.spec.ts`: fluxo completo; senha curta e comum; código
      inválido; download do arquivo nos dois navegadores; voltar e recarregar não reexibem segredo nem códigos; nada em
      URL/armazenamento/console

### Implementação

- [ ] T030 [P] [US2] `AUTH/password-change-form.ts` (formulário reaproveitado no perfil, US5)
- [ ] T031 [US2] `AUTH/password-change-page.ts` (`/primeiro-acesso/senha`) e o componente-pai `/primeiro-acesso` com o
      `SignInFlow`
- [ ] T032 [US2] `AUTH/mfa-enrollment-page.ts` (`/primeiro-acesso/autenticador`) com `ScreenState`
- [ ] T033 [US2] `AUTH/recovery-codes-page.ts` (`/primeiro-acesso/codigos`) usando `@canal/shared/files`

**Checkpoint**: contas novas, inclusive a do primeiro administrador, conseguem entrar.

---

## Phase 5: User Story 3 - Telas protegidas e menu por permissão (Priority: P1)

**Goal**: toda tela interna exige sessão com segundo fator; menu e rotas pelas permissões efetivas da API.

**Independent Test**: sem sessão, qualquer tela interna vai ao login e volta depois; conta `sem-permissoes` vê só
Painel e Meu perfil; rota proibida pelo endereço mostra acesso negado; 403 forçado mantém a sessão.

### Testes (escrever antes e ver falhar)

- [ ] T034 [P] [US3] Unitário de `projects/backoffice/src/app/layout/shell.spec.ts`: menu derivado das declarações de
      rota e do conjunto de permissões; sem permissão, item ausente
- [ ] T035 [P] [US3] E2E em `e2e/backoffice/guards.spec.ts`: todas as rotas do `Shell` sem sessão vão ao login (nenhuma
      com dados); retorno depois do login; retorno externo ignorado; menu por permissão; acesso negado pelo endereço;
      403 da API com sessão mantida; recarregar uma tela interna restaura pelo `/me`

### Implementação

- [ ] T036 [US3] Menu por permissão em `projects/backoffice/src/app/layout/shell.ts`, lendo `data.ability` das rotas
- [ ] T037 [US3] Página de acesso negado ligada ao `permissionGuard` e ao tratamento do 403

**Checkpoint**: nenhuma tela interna fica aberta sem sessão válida.

---

## Phase 6: User Story 4 - Expiração da sessão e saída (Priority: P1)

**Goal**: avisos pelos horários da API, encerramento que limpa tudo, saída sincronizada entre abas.

**Independent Test**: com o relógio do simulador, aviso de inatividade, "Continuar", expiração; aviso do limite de 8
horas sem "Continuar"; sair numa aba encerra a outra; uso numa aba evita o aviso na outra; voltar depois de sair não
mostra dados.

### Testes (escrever antes e ver falhar)

- [ ] T038 [P] [US4] Unitário de `projects/backoffice/src/app/layout/session-expiry-banner.spec.ts`: textos dos dois
      avisos, `role="alert"`, foco não roubado, "Continuar" só no de inatividade
- [ ] T039 [P] [US4] E2E em `e2e/backoffice/session-expiry.spec.ts` (relógio controlado do Playwright e do simulador):
      aviso de inatividade e "Continuar" (um `GET /me`); expiração por inatividade; aviso e encerramento absolutos; 401
      forçado; "Sair" com a chamada falhando ainda limpa; duas abas (saída e atividade); voltar depois de sair; resposta
      atrasada depois do encerramento descartada; nenhum dado de denúncia depois de cada encerramento
- [ ] T040 [P] [US4] E2E em `e2e/backoffice/cross-origin.spec.ts`: escrita administrativa vinda de outra origem é
      recusada pelo simulador e a feita pela interface (mesma origem, pelo proxy) passa (FR-026)

### Implementação

- [ ] T041 [US4] `projects/backoffice/src/app/layout/session-expiry-banner.ts` e ligação no `Shell`
- [ ] T042 [US4] Botão "Sair" no `Shell` chamando `POST /auth/sign-out` e `StaffSession.end('signed-out')` mesmo em
      falha

**Checkpoint**: nenhuma sessão esquecida expõe denúncias.

---

## Phase 7: User Story 5 - Meu perfil e troca de senha (Priority: P2)

**Goal**: dados da pessoa e troca de senha reaproveitando o formulário do primeiro acesso.

**Independent Test**: "Meu perfil" mostra nome, e-mail, perfis e data do segundo fator; troca de senha com sucesso
mostra o aviso de sessão renovada e outras sessões encerradas.

### Testes (escrever antes e ver falhar)

- [ ] T043 [P] [US5] Unitário de `projects/backoffice/src/app/features/profile/profile-page.spec.ts`: dados do
      `StaffSession`; sucesso com aviso; 422 `CURRENT_PASSWORD_INVALID` como erro no campo com a sessão mantida; 429 leva ao
      login com a mensagem de sessão encerrada; falha com campos limpos
- [ ] T044 [P] [US5] E2E em `e2e/backoffice/profile.spec.ts`: dados e troca de senha (sucesso, senha comum e senha
      atual errada, que mostra o erro no campo e não volta ao login; 5ª senha atual errada com 429, que volta ao login
      com a mensagem de sessão encerrada e nenhum dado na memória)

### Implementação

- [ ] T045 [US5] `projects/backoffice/src/app/features/profile/profile-page.ts` (substitui o placeholder) com o
      `password-change-form`

---

## Phase 8: Integração com a API (bloqueada)

- [ ] T046 ⛔ AUTH-01 a AUTH-07, USERS-07. `npm run api:sync && npm run api:generate`; trocar `AUTH/auth.types.ts`
      pelo cliente gerado `@canal/shared/api/admin`, remover a linha do Complexity Tracking e a do `AGENTS.md`
- [ ] T047 ⛔ Conferir o simulador contra `openapi/admin.json`: `nextStep`, horários, `abilities` (formato), 423 do
      desafio, 422 da troca de senha (`CURRENT_PASSWORD_INVALID` e códigos da política), formato `recurso.ação` das
      abilities, QR code PNG, cookie e proteção por origem
- [ ] T048 ⛔ Rodar os e2e desta feature contra a API real (compose com a API), com o cookie `__Host-sid` por HTTPS
- [ ] T049 ⛔ AUTH-07. Atualizar a T058 da feature 001 em `specs/001-shared-foundation/tasks.md`: em vez do cabeçalho
      `X-XSRF-TOKEN`, provar contra a API real que escrita administrativa de outra origem é recusada e a da interface
      passa; avaliar a remoção do `withXsrfConfiguration` inerte com decisão registrada

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T050 [P] Telas novas em `e2e/backoffice/layout.spec.ts` (320 px e zoom de 200%) e `e2e/backoffice/a11y.spec.ts` (novo,
      axe, como `e2e/portal/a11y.spec.ts`), mais o percurso de entrada e de primeiro acesso só com teclado
- [ ] T051 [P] Medir e registrar no `plan.md` o bundle inicial do backoffice (antes 347,0 kB, previsão ~355 kB) e o do
      portal (sem crescimento esperado pela extração da T018)
- [ ] T052 [P] `AGENTS.md` e `README.md`: `StaffSession` como único ponto de encerramento, proteção por origem no lugar
      do token XSRF, `@canal/shared/files`, contas e cenários do simulador
- [ ] T053 [P] Marcar os critérios atendidos em `docs/tarefas/05-backoffice-auth.md` e `docs/tarefas/12-perfil.md`,
      com a nota de que foram validados contra o simulador
- [ ] T054 Seguir `specs/004-backoffice-sign-in/quickstart.md` e a verificação final (lint, `lint:rules`, testes,
      `test:scripts`, build dos dois apps, `check:build`, `api:check`, e2e duas vezes)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; bloqueia todas as histórias.
- **US1 (Phase 3)**: depende da Foundational.
- **US2 (Phase 4)**: depende da Foundational; os e2e usam a tela de login da US1 (T024).
- **US3 (Phase 5)**: depende da Foundational; os e2e usam a entrada da US1.
- **US4 (Phase 6)**: depende da Foundational; os e2e usam a entrada da US1.
- **US5 (Phase 7)**: depende da US2 (T030, formulário de senha).
- **Integração (Phase 8)**: bloqueada pela API; não bloqueia nenhuma outra fase.
- **Polish (Phase 9)**: depois das histórias.

### Within Each User Story

- Testes antes, falhando primeiro.
- `SignInFlow` (T023) antes das páginas da US1 e da US2.
- `password-change-form` (T030) antes da página de senha (T031) e do perfil (T045).

### Parallel Opportunities

- Setup: T002, T003 e T004 em paralelo depois da T001.
- Foundational: todos os testes (T005 a T009) juntos; depois T010, T011, T014 e T018 em paralelo.
- Testes de US1, US2, US3 e US4 podem ser escritos juntos.
- US3 e US4 podem ser implementadas em paralelo à US2 (arquivos diferentes; só o `Shell` é comum a US3 e US4: T036 e
  T041/T042 em sequência).

## Parallel Example: Foundational

```text
T005 auth.types.spec.ts
T006 staff-session.spec.ts
T007 auth.guards.spec.ts
T008 activity.interceptor.spec.ts
T009 api-policy.spec.ts
```

## Implementation Strategy

### MVP First

Setup, Foundational, US1, US2, US3 e US4 (todas P1). Sem a US2 nenhuma conta nova entra; sem a US3 as telas ficam
abertas; sem a US4 uma sessão esquecida expõe denúncias. A US5 (P2) vem depois.

### Incremental Delivery

1. Setup + Foundational → sessão e guards prontos.
2. US1 → equipe com segundo fator entra.
3. US2 → primeiro acesso.
4. US3 → telas protegidas e menu.
5. US4 → expiração e saída.
6. US5 → perfil.
7. Integração quando a API publicar o contrato.

## Notes

- A etapa da senha não tem mensagem própria de bloqueio: 401 e 429 recebem a mesma mensagem (decisão do usuário).
- O bloqueio do desafio do segundo fator tem mensagem própria (423, a confirmar no contrato).
- Commits por fase ou história, com os hooks rodando.

## Pendências do analyze

| ID  | Severidade | Pendência                                                                                           | Onde resolver                      |
| --- | ---------- | --------------------------------------------------------------------------------------------------- | ---------------------------------- |
| C1  | LOW        | SC-001 (entrar em menos de 30 s) sem passo de validação manual no quickstart                        | T054 (quickstart)                  |
| C2  | LOW        | SC-003 não cita o 429 da etapa da senha e SC-004 não cita o encerramento pelo 429 da troca de senha | Polish, ao marcar critérios (T053) |
| D1  | LOW        | T014 e T037 tratam da tela de acesso negado: T014 cria o componente, T037 só liga 403 e menu        | No implement                       |
