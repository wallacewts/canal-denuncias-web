# 07 · Backoffice: triagem e tratativa

**Objetivo:** o gestor tria, atribui e prioriza. O responsável investiga, muda o status, registra notas e conclui com
desfecho.

**Depende de (backend):** CASE-01 a CASE-06, CASE-08, RET-03, REP-03.

**Telas existentes:** `features/triage/triage-page.ts` (`/triagem`) e as ações do detalhe (`/denuncias/:id`).

---

### BCASE-01 · Fila de triagem

**Estimativa:** M · **Marco:** MVP · **Depende de:** BREP-01, REP-03

- **Endpoints:** `GET /api/admin/v1/reports?status=RECEIVED` e `?status=IN_TRIAGE`.

**Critérios de aceite**

- [ ] Só para `COMPLIANCE_MANAGER`.
- [ ] Mostra as denúncias recebidas e em triagem, das mais antigas para as mais novas, com o prazo de triagem.
- [ ] Ação "Iniciar triagem" (`RECEIVED` → `IN_TRIAGE`) direto da fila.

### BCASE-02 · Atribuição

**Estimativa:** M · **Marco:** MVP · **Depende de:** BREP-02, CASE-03

- **Endpoints:** `PUT` e `DELETE /api/admin/v1/reports/:id/assignee`, mais a lista de analistas disponíveis (ver ponto
  em aberto no README: hoje só o ADMIN lista usuários em USERS-03).

**Critérios de aceite**

- [ ] Seleção entre analistas ativos, sem os bloqueados por conflito naquela denúncia.
- [ ] Remover a atribuição pede confirmação.
- [ ] O responsável atual aparece no topo do detalhe.

### BCASE-03 · Prioridade

**Estimativa:** P · **Marco:** MVP · **Depende de:** BREP-02, CASE-04

- **Endpoints:** `PUT /api/admin/v1/reports/:id/priority`.

**Critérios de aceite**

- [ ] Baixa, média, alta e crítica, só para `COMPLIANCE_MANAGER`.

### BCASE-04 · Mudança de status e conclusão

**Estimativa:** M · **Marco:** MVP · **Depende de:** BREP-02, CASE-01, CASE-02

- **Endpoints:** `POST /api/admin/v1/reports/:id/transitions` com `{ to, outcome?, justification? }`.

**Critérios de aceite**

- [ ] Mostra só as transições permitidas para o status e o perfil, conforme a tabela de CASE-01.
- [ ] Transições que exigem justificativa abrem um diálogo com o campo obrigatório.
- [ ] Concluir exige desfecho (procedente, parcialmente procedente ou improcedente) e justificativa. O diálogo avisa
      que o denunciante verá o desfecho (decisão D22).
- [ ] "Aguardar denunciante" só é oferecido depois de enviar uma mensagem. A tela mostra o prazo de resposta do
      denunciante e o SLA da equipe como suspenso (decisão D23).
- [ ] Erro 409 de transição inválida recarrega o detalhe e explica o motivo.

### BCASE-05 · Notas internas

**Estimativa:** P · **Marco:** MVP · **Depende de:** BREP-02, CASE-06

- **Endpoints:** `GET` e `POST /api/admin/v1/reports/:id/notes`.

**Critérios de aceite**

- [ ] Aba com o aviso fixo "Notas internas não são vistas pelo denunciante".
- [ ] Autor, data e hora exatas em cada nota.

### BCASE-06 · Conflito de interesse

**Estimativa:** M · **Marco:** MVP · **Depende de:** BREP-02, CASE-05

- **Endpoints:** `POST /api/admin/v1/reports/:id/access-blocks`, `DELETE /api/admin/v1/reports/:id/access-blocks/:userId`,
  `POST /api/admin/v1/reports/:id/access-blocks/me`.

**Critérios de aceite**

- [ ] O gestor bloqueia um usuário informando o motivo, e pode remover o bloqueio.
- [ ] Qualquer pessoa da equipe com acesso pode declarar conflito sobre si mesma. O diálogo avisa que o acesso será
      perdido na hora, e depois a tela volta para a caixa.
- [ ] Bloquear o responsável atual avisa que a atribuição será desfeita.

### BCASE-07 · Prazo de resposta vencido

**Estimativa:** P · **Marco:** Produção · **Depende de:** BREP-01, CASE-08

**Critérios de aceite**

- [ ] Denúncias em `AWAITING_REPORTER` com prazo vencido aparecem no filtro "vencidas" com um rótulo próprio
      ("Sem resposta do denunciante").

### BCASE-08 · Legal hold

**Estimativa:** P · **Marco:** Produção · **Depende de:** BREP-02, RET-03

- **Endpoints:** `PUT /api/admin/v1/reports/:id/legal-hold`.

**Critérios de aceite**

- [ ] Só o DPO liga ou desliga, com justificativa e confirmação.
- [ ] Denúncia com legal hold mostra um selo no detalhe e na caixa.
