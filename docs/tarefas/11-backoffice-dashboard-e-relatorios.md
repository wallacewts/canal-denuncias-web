# 11 · Backoffice: painel e relatórios

**Objetivo:** visão agregada do canal (volumes, prazos, desfechos), sem nenhum dado pessoal.

**Depende de (backend):** REP-03, REPT-01 a REPT-03.

**Telas existentes:** `features/dashboard/dashboard-page.ts` (`/painel`), `features/reporting/reporting-page.ts`
(`/relatorios`).

---

### BRPT-01 · Painel inicial por perfil

**Estimativa:** P · **Marco:** MVP · **Depende de:** BREP-01, REP-03

Enquanto os indicadores não existem, o painel é a porta de entrada de cada perfil, com dados da própria caixa.

**Critérios de aceite**

- [ ] Analista: denúncias atribuídas a ele e quantas estão vencidas.
- [ ] Gestor: denúncias aguardando triagem e vencidas.
- [ ] Atalhos para a caixa já filtrada.

### BRPT-02 · Indicadores

**Estimativa:** M · **Marco:** Produção · **Depende de:** BRPT-01, REPT-01

- **Endpoints:** `GET /api/admin/v1/reporting/summary?from=&to=`.

**Critérios de aceite**

- [ ] Para `COMPLIANCE_MANAGER`, `DPO` e `AUDITOR`.
- [ ] Totais por status, categoria, tipo de denunciante e desfecho, e percentual dentro do SLA, com seleção de
      período.

### BRPT-03 · Série mensal

**Estimativa:** P · **Marco:** Produção · **Depende de:** BRPT-02, REPT-02

- **Endpoints:** `GET /api/admin/v1/reporting/monthly?months=12`.

**Critérios de aceite**

- [ ] Gráfico com biblioteca empacotada no bundle e compatível com a CSP estrita e Trusted Types (escolha registrada).
- [ ] Tabela com os mesmos números ao lado do gráfico, para acessibilidade.

### BRPT-04 · Exportação CSV

**Estimativa:** P · **Marco:** Evolução · **Depende de:** BRPT-02, REPT-03

- **Endpoints:** `GET /api/admin/v1/reporting/export.csv?from=&to=`.

**Critérios de aceite**

- [ ] Download por `Blob` do período selecionado, só com dados agregados.
