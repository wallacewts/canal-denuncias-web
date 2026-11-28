---
description: 'Lista de tarefas do envio de denúncia pelo portal (002-report-submission-wizard)'
---

# Tasks: Envio de denúncia pelo portal (wizard, início e protocolo)

**Input**: Design documents from `/specs/002-report-submission-wizard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are MANDATORY for every privacy, security, permission, encryption or audit rule (constitution, principle
VI). Nesta feature isso cobre URL, título, armazenamento, console, nome do arquivo baixado, exibição única da chave,
descarte ao sair e por inatividade, envio sem duplicar e o simulador fora do build. Os testes de cada história vêm
**antes** da implementação e precisam falhar primeiro. Nas regras de privacidade, usar também entradas curtas e casos de
borda (limites exatos, texto curto com caracteres especiais).

**Organization**: tarefas agrupadas por user story, para que cada uma possa ser implementada e testada sozinha.

**Bloqueios do backend**: tarefas marcadas com ⛔ só podem ser concluídas quando CAT-01 e REP-02 estiverem no contrato
da API (`../canal-denuncias-api/openapi/public.json`). Até lá, ficam em aberto e não impedem as outras (opção A).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: user story da spec (US1 a US3)
- Caminhos relativos à raiz do repositório `canal-denuncias-web`. `FLOW` = `projects/portal/src/app/features/new-report`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: ambiente fixo e servidor simulado fora do código dos apps.

- [x] T001 Versionar `.tool-versions` (nodejs 26.13.1) e citar o asdf nos pré-requisitos do `README.md`
- [x] T002 Criar `tools/mock-api/server.mjs` absorvendo `e2e/support/echo-api.mjs` (rotas `/fixture/*` e eco
      idênticos), apagar o arquivo antigo e apontar o serviço `e2e-api` de `docker-compose.e2e.yml` para o novo
      caminho; o e2e da feature 001 continua verde
- [x] T003 [P] Script `dev:mock-api` em `package.json` (`node tools/mock-api/server.mjs`, porta 3000, a do
      `proxy.conf.json`)
- [x] T004 [P] Regra `no-restricted-imports` em `eslint.config.js` proibindo `projects/**` de importar `tools/**` e
      `e2e/**`, com o caso de reprovação em `scripts/check-lint-rules.mjs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: simulador completo, prova de que ele não entra no build, tipos provisórios, rascunho tipado e a
rota-pai do fluxo. **Nenhuma user story começa antes desta fase.**

### Testes (escrever antes e ver falhar)

- [x] T005 [P] Teste `scripts/check-build-output.test.mjs`: um `dist` falso com `DV-SIMUL`, `SIMULADA`, `__mock` ou
      `mock-api` reprova; um `dist` limpo passa
- [x] T006 [P] Teste `tools/mock-api/server.test.mjs` (node --test): categorias `ok`/`empty`/`error`; envio
      `ok`/`invalid`/`error`/`slow`; 400 para campo fora do contrato ou limite estourado **sem repetir o valor**
      (inclusive texto curto); contador de envios; `reset`
- [x] T007 [P] Testes `FLOW/report-submission.types.spec.ts`: `toCategories` e `toReceipt` aceitam o formato válido e
      recusam o malformado (campo ausente, tipo errado, lista com item inválido)
- [x] T008 [P] Testes `FLOW/to-submission.spec.ts`: só os campos previstos; `occurredOn` como `AAAA-MM-DD` ou
      `AAAA-MM`; opcionais vazios omitidos; nenhum campo de identificação
- [x] T009 [P] Testes `FLOW/report-draft.state.spec.ts`: limites exatos (99/100 e 10.000/10.001 na descrição,
      2.000/2.001 nos demais textos, 20/21 envolvidos); data e mês futuros recusados; validade por subgrupo; "rascunho
      com dados"; `clear()` volta ao estado inicial
- [x] T010 [P] Testes `FLOW/report-submission.api.spec.ts` (`HttpTestingController`): `GET api:/public/v1/categories`
      e `POST api:/public/v1/reports` sem credenciais (política do portal) e com a resposta validada

### Implementação

- [x] T011 Sentinelas do simulador em `scripts/check-build-output.mjs` e o novo teste incluído em `test:scripts`
      (`package.json`)
- [x] T012 Rotas e cenários de `contracts/mock-api.md` em `tools/mock-api/server.mjs` (categorias, envio com a
      validação de REP-02, `/__mock/scenario`, `/__mock/stats`, `/__mock/reset`), sem nunca registrar o corpo recebido
- [x] T013 [P] Tipos provisórios e validação em tempo de execução em `FLOW/report-submission.types.ts`, marcados como
      provisórios no código
- [x] T014 [P] Montagem do corpo em `FLOW/to-submission.ts`
- [x] T015 `FLOW/report-draft.state.ts`: `FormGroup` tipado com subgrupos por etapa, validadores de REP-02, "rascunho
      com dados" e descarte no `ngOnDestroy`
- [x] T016 `FLOW/report-submission.api.ts` com os tipos provisórios
- [x] T017 [P] Tabela única de etapas em `FLOW/wizard-steps.ts` (caminho, título, obrigatória, subgrupo)
- [x] T018 [P] `FLOW/receipt.state.ts`: comprovante e `acknowledged`, descartado no `ngOnDestroy`
- [x] T019 Reestruturar `projects/portal/src/app/app.routes.ts`: rota-pai `nova-denuncia` com `FLOW/new-report-flow.ts`
      (substitui `new-report-wizard.ts`) fornecendo `ReportDraftState` e `ReceiptState`; `revisao` e `protocolo` como
      filhas; remover `anexos` e `identificacao` (apagar `FLOW/steps/attachments-step.ts` e
      `FLOW/steps/identification-step.ts`); atualizar `e2e/portal/routes.ts`; e2e de rotas, acessibilidade e layout
      continuam verdes

**Checkpoint**: simulador pronto e fora do build, rascunho tipado e rota-pai no lugar.

---

## Phase 3: User Story 1 - Relatar e receber protocolo e chave (Priority: P1) 🎯 MVP

**Goal**: o fluxo completo do início do wizard até a saída da tela do protocolo, contra o simulador.

**Independent Test**: percorrer o fluxo no e2e com as guardas de privacidade, nos dois navegadores, e conferir a tela
do protocolo, a cópia e o download.

### Testes (escrever antes e ver falhar)

- [x] T020 [P] [US1] `e2e/portal/new-report.spec.ts`: fluxo feliz com `privacyGuards`; URL só com o nome da etapa;
      título sem protocolo, chave ou trecho do relato; tela do protocolo com os valores simulados e a data só com o
      dia; download `comprovante-denuncia.txt` com protocolo, chave e data no conteúdo; cópia testada nos dois caminhos da
      research R11 (sucesso com retorno anunciado no Chromium, onde a origem de teste é segura; orientação de fallback
      com o valor selecionável no Firefox, onde a área de transferência não existe nessa origem); em cada etapa, o foco
      está no `h1` e `aria-current="step"` aponta a etapa certa;
      "Concluir" só depois de marcar "Guardei" e volta para `/`
- [x] T021 [P] [US1] No mesmo arquivo: cenário `slow` com clique duplo gera um envio só (`/__mock/stats`); categorias
      `error` com "Tentar de novo" e `empty` sem permitir avançar; uma variante percorre o fluxo inteiro só com o teclado (Tab, Espaço e Enter), do
      início até "Concluir" (SC-007)
- [x] T022 [P] [US1] Testes das etapas em `FLOW/steps/*.spec.ts`: tipo (códigos enviados, obrigatório, texto sobre não
      identificar); categoria (carregando, erro, vazio, ordem da API); relato (contador anunciado, limites, data exata
      ou mês e ano, tipos de dados, orientação, campos sem preenchimento automático); envolvidos (até 20, foco na linha
      nova; ao remover, foco no primeiro campo da linha seguinte, senão da anterior, senão no botão "Adicionar
      envolvido"; teclado)
- [x] T023 [P] [US1] Testes `FLOW/review-page.spec.ts`: mostra tudo o que será enviado, links de edição por etapa,
      link do aviso de privacidade antes do botão, botão desabilitado durante o envio, sucesso grava o comprovante,
      limpa o rascunho e navega
- [x] T024 [P] [US1] Testes `FLOW/protocol-issued-page.spec.ts` e `FLOW/receipt-file.spec.ts`: exibição a partir da
      memória; "Concluir" exige a marcação; ao concluir, apaga; `Blob` `text/plain`, nome fixo sem protocolo nem chave,
      `revokeObjectURL` chamado; cópia negada mostra a orientação e o valor continua selecionável
- [x] T025 [P] [US1] `e2e/portal/a11y.spec.ts` e `e2e/portal/layout.spec.ts` (novo, se não existir): axe em cada
      etapa, na revisão (com o diálogo do aviso aberto) e no protocolo com o fluxo preenchido; 320 px e zoom de 200%

### Implementação

- [x] T026 [US1] `FLOW/wizard-progress.ts` ("Etapa N de 5 · Nome", `aria-current="step"`) e foco no título a cada
      troca de etapa em `FLOW/new-report-flow.ts`
- [x] T027 [P] [US1] `FLOW/steps/reporter-type-step.ts`
- [x] T028 [P] [US1] `FLOW/steps/category-step.ts` com `LoadingState`, `EmptyState` e "Tentar de novo"
- [x] T029 [P] [US1] `FLOW/steps/description-step.ts`: contador, "quando aconteceu" com controles nativos (research R9),
      tipos de dados, orientação, `FormFieldError` e `sensitive-input`
- [x] T030 [P] [US1] `FLOW/steps/involved-step.ts`
- [x] T031 [P] [US1] Extrair `projects/portal/src/app/features/privacy/privacy-notice-content.ts` de
      `privacy-notice-page.ts` e criar o diálogo do aviso usado pela revisão
- [x] T032 [US1] `FLOW/review-page.ts`: resumo, links de edição, diálogo do aviso, envio com botão desabilitado e, no
      sucesso, `ReceiptState`, limpeza do rascunho e navegação para `protocolo`
- [x] T033 [P] [US1] `FLOW/receipt-file.ts` (research R7)
- [x] T034 [US1] `FLOW/protocol-issued-page.ts`: exibição, copiar com região `aria-live` e orientação de falha
      (research R11), baixar, aviso de que não há recuperação, marcação e "Concluir"

**Checkpoint**: envio completo funcionando contra o simulador.

---

## Phase 4: User Story 2 - Rascunho sem rastro e sem perda por engano (Priority: P1)

**Goal**: etapas não podem ser puladas, saída e recarga avisam, erro não apaga nada e a inatividade descarta o
rascunho e o comprovante.

**Independent Test**: e2e que navega, pula etapas pela URL, força erro de envio, recarrega, tenta sair e avança o
relógio, conferindo o rascunho e o armazenamento a cada passo.

**Depende de**: US1 (os testes de ponta a ponta usam as telas). Os testes unitários desta fase podem começar junto com
a US1.

### Testes (escrever antes e ver falhar)

- [x] T035 [P] [US2] `e2e/portal/new-report-draft.spec.ts`: endereço de etapa posterior volta para a primeira pendente;
      dados mantidos ao navegar; diálogo do aviso de privacidade mantém o rascunho; envio `invalid` e `error` mantêm o
      rascunho idêntico e permitem tentar de novo; recarregar o protocolo e abri-lo direto mostram só o aviso;
      armazenamento do navegador vazio o tempo todo
- [x] T036 [P] [US2] No mesmo arquivo: `beforeunload` ao recarregar com dados (evento de diálogo do Playwright); sair
      para `/ajuda` pede confirmação (cancelar mantém, confirmar apaga); voltar do navegador na tela do protocolo pede
      confirmação
- [x] T037 [P] [US2] No mesmo arquivo, com `page.clock`: aviso aos 25 min e "Continuar" reiniciando a contagem;
      descarte aos 30 min no wizard (volta para `tipo` com aviso) e na tela do protocolo (só o aviso, sem a chave)
- [x] T038 [P] [US2] Testes `FLOW/inactivity-timer.spec.ts` com timers falsos: aviso aos 25, continuar reinicia, descarte
      aos 30, atividade por teclado, ponteiro e navegação, timers limpos ao destruir
- [x] T039 [P] [US2] Testes `FLOW/new-report-flow.spec.ts` e `FLOW/new-report-flow.guards.spec.ts`: primeira etapa
      pendente; `canDeactivate` dentro e fora do fluxo; protocolo sem marcação; `beforeunload` só com dados ou
      comprovante

### Implementação

- [x] T040 [US2] Controle de etapas puladas em `FLOW/new-report-flow.ts` (research R5)
- [x] T041 [US2] `beforeunload` em `FLOW/new-report-flow.ts` só com rascunho preenchido ou comprovante
- [x] T042 [US2] `FLOW/new-report-flow.guards.ts` (saída do fluxo e da tela do protocolo, com `ConfirmDialog`)
      registrados em `projects/portal/src/app/app.routes.ts`
- [x] T043 [US2] `FLOW/inactivity-timer.ts` com aviso e descarte, ligado ao fluxo e à tela do protocolo
- [x] T044 [US2] Erro de envio mantém o rascunho e oferece "Tentar de novo" em `FLOW/review-page.ts`; aviso de
      comprovante indisponível em `FLOW/protocol-issued-page.ts`

**Checkpoint**: US1 e US2 completas, o MVP do envio.

---

## Phase 5: User Story 3 - Página inicial (Priority: P2)

**Goal**: a página inicial explica o canal, as garantias e os caminhos.

**Independent Test**: abrir `/` e conferir textos, links e acessibilidade, sem depender da API.

- [x] T045 [P] [US3] `e2e/portal/home.spec.ts` (escrever antes): o que relatar, quem pode relatar, as garantias, a
      recomendação de dispositivo e rede pessoais, links para `/nova-denuncia/tipo` e `/consultar`, axe
- [x] T046 [US3] `projects/portal/src/app/features/home/home-page.ts`

---

## Phase 6: Integração com a API (bloqueada)

**Purpose**: trocar o simulado pelo real quando a API publicar os endpoints.

- [ ] T047 ⛔ CAT-01, REP-02: `npm run api:sync && npm run api:generate`; conferir os endpoints no cliente público e
      reexportar as `functions` em `projects/shared/src/api/public.ts`
- [ ] T048 ⛔ CAT-01, REP-02: `FLOW/report-submission.api.ts` passa a usar o cliente gerado; apagar
      `FLOW/report-submission.types.ts` e tirar a exceção de "Complexity Tracking" do `plan.md`
- [ ] T049 ⛔ CAT-01, REP-02: teste `tools/mock-api/contract.test.mjs` que valida as respostas do simulador contra os
      schemas de `openapi/public.json`
- [ ] T050 ⛔ CAT-01, REP-02: rodar `e2e/portal/new-report.spec.ts` contra a API real (`APP_API_UPSTREAM`) e registrar o
      resultado em `docs/validacoes/integracao-envio.md`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T051 Medir o bundle (inicial do portal até 380 kB, chunks do fluxo até 150 kB somados) e registrar em
      `docs/validacoes/bundle.md`
- [ ] T052 [P] Atualizar `AGENTS.md` e `README.md` (simulador, `dev:mock-api`, sentinelas, regra de import,
      `.tool-versions`)
- [ ] T053 [P] Atualizar `docs/validacoes/csp.md` com o diálogo e os componentes novos que passam a aparecer nas telas
      (avança a T027 da feature 001)
- [ ] T054 Marcar os critérios de aceite em `docs/tarefas/01-portal-nova-denuncia.md` (PNEW-01 a PNEW-06),
      `docs/tarefas/02-portal-protocolo-e-consulta.md` (PACC-01) e `docs/tarefas/04-portal-paginas-institucionais.md`
      (PINF-01), com nota nos que dependem da integração
- [ ] T055 Seguir o `quickstart.md` e a verificação final: `lint`, `lint:rules`, `test`, `test:scripts`, build dos dois
      apps, `check:build`, `api:check` e `e2e`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências. T002 antes de T012.
- **Foundational (Phase 2)**: depende do Setup. Bloqueia todas as histórias. T019 depende de T015, T017 e T018.
- **US1 (Phase 3)**: depende da Foundational.
- **US2 (Phase 4)**: depende da Foundational; os e2e (T035 a T037) e T044 dependem da US1. T038, T039 e T043 podem
  começar junto com a US1.
- **US3 (Phase 5)**: depende só do Setup (rota `/` já existe); pode rodar em paralelo com US1 e US2.
- **Integração (Phase 6)**: ⛔ bloqueada até CAT-01 e REP-02 saírem no contrato da API; depois, depende da US1.
- **Polish (Phase 7)**: depois das histórias desejadas.

### Within Each User Story

- Testes primeiro, falhando; depois estados e serviços; depois telas; por fim a integração entre elas.
- `review-page.ts` (T032) depende das etapas (T027 a T030) e do diálogo (T031). `protocol-issued-page.ts` (T034)
  depende de T033.
- T040 a T042 mexem em `new-report-flow.ts` e `app.routes.ts`: rodam em sequência.

### Parallel Opportunities

- Setup: T003 e T004.
- Foundational: todos os testes (T005 a T010); depois T013, T014, T017 e T018.
- US1: todos os testes (T020 a T025); depois as quatro etapas (T027 a T030), T031 e T033.
- US2: todos os testes (T035 a T039).
- US3 inteira em paralelo com US1 e US2.

## Parallel Example: User Story 1

```text
Testes juntos: T020, T021, T022, T023, T024, T025
Etapas juntas: T027 reporter-type-step, T028 category-step, T029 description-step, T030 involved-step
Depois: T031 diálogo do aviso, T033 receipt-file; em seguida T032 review-page e T034 protocol-issued-page
```

## Implementation Strategy

### MVP First

1. Setup e Foundational.
2. US1 (envio completo contra o simulador). **Parar e validar**: e2e do fluxo feliz verde nos dois navegadores.
3. US2 (garantias do rascunho). US1 e US2 juntas são o MVP do envio: sem a US2, um rascunho poderia ser perdido ou
   ficar exposto num computador compartilhado.

### Incremental Delivery

1. Base pronta → US1 → validar → US2 → validar (MVP) → US3 → Polish.
2. Quando a API publicar CAT-01 e REP-02: Phase 6, sem reabrir as histórias.

## Notes

- Nunca afrouxar a CSP nem usar `bypassCSP` para um teste passar.
- Nada de `localStorage`, `sessionStorage`, IndexedDB, `document.cookie` ou `console.*` no código dos apps.
- Um commit por fase, com os hooks rodando, sem push.

## Pendências do analyze

Achados de baixa severidade do analyze de 2026-11-28, a resolver durante o implement:

- **C3** (resolvida na T045): a página inicial (`/`) entra no teste de zoom de 200% e 320 px.
- **C4** (resolvida na T035): asserção de que `/nova-denuncia/anexos` e `/nova-denuncia/identificacao` não exibem a etapa.
- **C5**: SC-001 (menos de 5 minutos, sem ajuda) fica como validação manual no `quickstart.md`.
- **U2**: caminho do diálogo da T031 (`projects/portal/src/app/features/privacy/privacy-notice-dialog.ts`) e os arquivos de
  teste novos na árvore do `plan.md`.
- **U3**: `e2e/portal/layout.spec.ts` é novo (o texto da T025 diz "se não existir").
- **D1**: FR-001 e FR-035 se sobrepõem (URL, título, console); consolidar na spec.
- **I2**: citar "Comprovante de envio (Receipt)" na spec para alinhar com o data-model.
