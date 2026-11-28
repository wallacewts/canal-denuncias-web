# 12 · Backoffice: meu perfil

**Objetivo:** cada pessoa da equipe vê os próprios dados, troca a senha e controla as sessões abertas.

**Depende de (backend):** USERS-07, AUTH-02, AUTH-05.

**Telas existentes:** `features/profile/profile-page.ts` (`/perfil`).

---

> **Feature 004 do front (2026-11-28):** BPRF-01 e BPRF-02 atendidos e validados contra o simulador; conferência com
> a API real na integração da feature 004. BPRF-03 (Produção) continua aberto.

### BPRF-01 · Meus dados

**Estimativa:** P · **Marco:** MVP · **Depende de:** BAUTH-05, USERS-07

- **Endpoints:** `GET /api/admin/v1/me`.

**Critérios de aceite**

- [x] Nome, e-mail, perfis e data de ativação do MFA.

### BPRF-02 · Trocar senha

**Estimativa:** P · **Marco:** MVP · **Depende de:** BPRF-01, AUTH-05

- **Endpoints:** `PUT /api/admin/v1/me/password`.

**Critérios de aceite**

- [x] Reaproveita o formulário de BAUTH-04.
- [x] Depois da troca, avisa que a sessão foi renovada.

### BPRF-03 · Sessões ativas

**Estimativa:** P · **Marco:** Produção · **Depende de:** BPRF-01, AUTH-02

- **Endpoints:** `GET /api/admin/v1/me/sessions`, `DELETE /api/admin/v1/me/sessions/:id`.

**Critérios de aceite**

- [ ] Lista criação, último uso, IP e navegador, com a sessão atual marcada.
- [ ] Encerrar outra sessão pede confirmação. Encerrar a atual equivale a sair (BAUTH-07).
