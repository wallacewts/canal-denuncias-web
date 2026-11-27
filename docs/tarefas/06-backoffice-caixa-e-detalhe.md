# 06 · Backoffice: caixa e detalhe da denúncia

**Objetivo:** a equipe encontra as denúncias que pode ver e abre o detalhe com relato, histórico, mensagens e anexos.

**Depende de (backend):** REP-03, REP-04, CASE-07, MSG-03, MSG-04, ATT-03, ATT-04, ACL-02, ACL-03, TRV-08.

**Telas existentes:** `features/reports/report-inbox-page.ts` (`/denuncias`), `features/reports/report-detail-page.ts`
(`/denuncias/:id`, com abas).

---

### BREP-01 · Caixa de denúncias

**Estimativa:** M · **Marco:** MVP · **Depende de:** BAUTH-05, REP-03

- **Endpoints:** `GET /api/admin/v1/reports?status=&categoryId=&priority=&assignedTo=&overdue=&after=&limit=`.

**Critérios de aceite**

- [ ] Tabela com protocolo, categoria, tipo de denunciante, status, prioridade, responsável, recebimento e prazo.
- [ ] Filtros por status, categoria, prioridade, "atribuídas a mim" e "vencidas". Os filtros podem ir na query string,
      porque não são dados sensíveis.
- [ ] "Carregar mais" com o cursor da API (sem paginação por número de página).
- [ ] Prazo vencido destacado. Em `AWAITING_REPORTER`, o prazo da equipe aparece como suspenso (decisão D23).
- [ ] Datas com hora exata.

### BREP-02 · Detalhe: relato

**Estimativa:** M · **Marco:** MVP · **Depende de:** BREP-01, REP-04

- **Endpoints:** `GET /api/admin/v1/reports/:id`.

**Critérios de aceite**

- [ ] Mostra os metadados e o relato decifrado (descrição, quando, onde, sistemas, tipos de dados, envolvidos, como
      soube, evidências).
- [ ] Indica se a denúncia tem identificação (`hasIdentity`), sem mostrar a identidade (ela só sai pelo fluxo de
      08-backoffice-identidade).
- [ ] O DPO vê a denúncia em modo somente leitura, sem nenhum botão de ação (decisão D20).
- [ ] Denúncia expurgada (410) mostra "Denúncia expurgada pela política de retenção".
- [ ] Ao sair da tela, o relato é apagado da memória.

### BREP-03 · Detalhe: histórico

**Estimativa:** P · **Marco:** MVP · **Depende de:** BREP-02, CASE-07

- **Endpoints:** `GET /api/admin/v1/reports/:id/history`.

**Critérios de aceite**

- [ ] Linha do tempo com status, desfecho, quem fez, data e hora exatas e justificativa.

### BREP-04 · Detalhe: mensagens

**Estimativa:** M · **Marco:** MVP · **Depende de:** BREP-02, MSG-03, MSG-04

- **Endpoints:** `GET` e `POST /api/admin/v1/reports/:id/messages`.

**Critérios de aceite**

- [ ] Conversa com indicação de quem escreveu na equipe e "Denunciante" para o outro lado.
- [ ] Aviso no campo de envio: o denunciante vê a mensagem como "Equipe de apuração".
- [ ] Botão de atualizar. Só quem pode tratar a denúncia vê o campo de envio (o DPO não vê).

### BREP-05 · Detalhe: anexos

**Estimativa:** M · **Marco:** Produção · **Depende de:** BREP-02, ATT-03, ATT-04

- **Endpoints:** `POST /api/admin/v1/reports/:id/attachments`, `GET /api/admin/v1/attachments/:id/content`.

**Critérios de aceite**

- [ ] Lista com nome, tipo, tamanho, quem enviou e resultado da varredura.
- [ ] Download por `Blob`, sem abrir o arquivo dentro do app.
- [ ] Upload com as mesmas validações de ATT-01.

### BREP-06 · Acesso negado e conflito

**Estimativa:** P · **Marco:** MVP · **Depende de:** BREP-02, ACL-02

**Critérios de aceite**

- [ ] 403 e 404 no detalhe mostram a mesma mensagem ("Denúncia não encontrada ou sem acesso"), sem confirmar se ela
      existe.
- [ ] Depois de declarar conflito de interesse (BCASE-06), a tela volta para a caixa.
