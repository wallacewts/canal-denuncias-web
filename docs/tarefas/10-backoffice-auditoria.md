# 10 · Backoffice: trilha de auditoria

**Objetivo:** o auditor consulta quem fez o quê e quando, e confere se a cadeia de hash está íntegra.

**Depende de (backend):** AUDIT-06, AUDIT-07.

**Telas existentes:** `features/audit/audit-trail-page.ts` (`/auditoria`).

---

### BAUD-01 · Consulta da trilha

**Estimativa:** M · **Marco:** Produção · **Depende de:** BAUTH-05, AUDIT-06

- **Endpoints:** `GET /api/admin/v1/audit-logs?actorUserId=&action=&resourceType=&resourceId=&from=&to=&after=&limit=`.

**Critérios de aceite**

- [ ] Só para `AUDITOR` (decisão D25).
- [ ] Filtros por ator, ação, tipo e id do recurso e período. "Carregar mais" por cursor.
- [ ] Data e hora exatas, inclusive das ações do denunciante (decisão D25).
- [ ] Ações do denunciante aparecem como "Denunciante", sem IP e sem user-agent.
- [ ] `metadata` exibido como lista de chave e valor.

### BAUD-02 · Verificação de integridade

**Estimativa:** P · **Marco:** Produção · **Depende de:** BAUD-01, AUDIT-07

- **Endpoints:** `POST /api/admin/v1/audit-logs/verification`.

**Critérios de aceite**

- [ ] Botão "Verificar integridade" com indicação de progresso.
- [ ] Resultado: cadeia íntegra, com quantidade de registros verificados, ou o primeiro registro divergente em
      destaque.
