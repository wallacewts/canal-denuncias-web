# 09 · Backoffice: usuários e configurações

**Objetivo:** o ADMIN cadastra a equipe e os perfis. ADMIN e DPO ajustam prazos, categorias e retenção.

**Depende de (backend):** USERS-02 a USERS-06, CAT-02, CAT-03, RET-04.

**Telas existentes:** `features/users/users-page.ts` (`/usuarios`), `features/settings/settings-page.ts`
(`/configuracoes`).

---

### BADM-01 · Lista de usuários

**Estimativa:** P · **Marco:** MVP · **Depende de:** BAUTH-05, USERS-03

- **Endpoints:** `GET /api/admin/v1/users?status=&role=&after=&limit=`.

**Critérios de aceite**

- [ ] Só para `ADMIN`. Mostra nome, e-mail, perfis, status, se tem MFA e último login.
- [ ] Filtros por status e perfil, com "carregar mais" por cursor.

### BADM-02 · Criar usuário

**Estimativa:** M · **Marco:** MVP · **Depende de:** BADM-01, USERS-02

- **Endpoints:** `POST /api/admin/v1/users`.

**Critérios de aceite**

- [ ] Nome, e-mail e perfis.
- [ ] A senha provisória da resposta aparece uma única vez, com botão de copiar e aviso para entregar por canal
      seguro. Ao fechar o diálogo, ela é apagada da memória.

### BADM-03 · Editar nome e status

**Estimativa:** P · **Marco:** MVP · **Depende de:** BADM-01, USERS-04

- **Endpoints:** `PATCH /api/admin/v1/users/:id`, `PUT /api/admin/v1/users/:id/status`.

**Critérios de aceite**

- [ ] Bloquear e desativar pedem confirmação e avisam que as sessões da pessoa serão encerradas.
- [ ] O ADMIN não vê a opção de desativar a si mesmo.
- [ ] O caso de usuário com denúncias atribuídas segue a regra que o backend definir em USERS-04 (ponto em aberto),
      com mensagem clara para o 409.

### BADM-04 · Perfis

**Estimativa:** M · **Marco:** MVP · **Depende de:** BADM-01, USERS-05

- **Endpoints:** `PUT /api/admin/v1/users/:id/roles`.

**Critérios de aceite**

- [ ] Perfis em caixas de seleção, com a descrição de cada um.
- [ ] Na própria linha, os controles ficam desabilitados com a explicação "Seus perfis só podem ser alterados por outro
      administrador" (decisão D21).
- [ ] O ADMIN pode acumular perfis que leem denúncias (decisão D21).
- [ ] Erro de "último ADMIN ativo" mostrado com mensagem própria.

### BADM-05 · Resetar MFA

**Estimativa:** P · **Marco:** MVP · **Depende de:** BADM-01, USERS-06

- **Endpoints:** `POST /api/admin/v1/users/:id/mfa-reset`.

**Critérios de aceite**

- [ ] Confirmação explicando que a pessoa vai cadastrar o MFA de novo no próximo login.

### BADM-06 · Prazos e retenção

**Estimativa:** M · **Marco:** Produção · **Depende de:** BAUTH-05, CAT-03

- **Endpoints:** `GET /api/admin/v1/settings`, `PUT /api/admin/v1/settings/:key`.

**Critérios de aceite**

- [ ] `ADMIN` edita SLA de triagem e de investigação, prazo de resposta do denunciante e janela de revelação.
- [ ] `DPO` edita os prazos de retenção por desfecho.
- [ ] Validação dos limites antes do envio, com as unidades (horas, dias, minutos) explícitas.
- [ ] Texto informa que mudar a retenção vale conforme a regra definida em CAT-03 (ponto em aberto) e que os backups
      são mantidos por tempo indeterminado (decisão D26).

### BADM-07 · Categorias

**Estimativa:** P · **Marco:** Produção · **Depende de:** BAUTH-05, CAT-02

- **Endpoints:** `GET`, `POST /api/admin/v1/categories` e `PATCH /api/admin/v1/categories/:id`.

**Critérios de aceite**

- [ ] Criar, editar, ativar e desativar categorias, e mudar a ordem de exibição.
- [ ] Categoria desativada some do formulário público, mas continua nas denúncias antigas.

### BADM-08 · Próximos expurgos

**Estimativa:** P · **Marco:** Produção · **Depende de:** BAUTH-05, RET-04

- **Endpoints:** `GET /api/admin/v1/retention/upcoming?days=30`.

**Critérios de aceite**

- [ ] Só para `DPO`. Lista protocolo, categoria, desfecho e data prevista do expurgo, sem conteúdo.
- [ ] Atalho para ligar o legal hold (BCASE-08).
