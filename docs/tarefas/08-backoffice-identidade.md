# 08 · Backoffice: identidade do denunciante

**Objetivo:** fluxo de revelação da identidade com justificativa, aprovação por outra pessoa e janela curta de
visualização. A API não decifra a identidade; quem faz isso é o `identity-worker` isolado (decisão D24). Para o front,
o fluxo é o mesmo.

**Depende de (backend):** IDV-02 a IDV-06.

**Telas existentes:** aba "Identidade" do detalhe (`/denuncias/:id`). A fila do DPO ainda não tem rota.

---

### BIDV-01 · Pedir revelação

**Estimativa:** M · **Marco:** Produção · **Depende de:** BREP-02, IDV-02

- **Endpoints:** `POST /api/admin/v1/reports/:id/identity-reveal-requests`.

**Critérios de aceite**

- [ ] A aba só aparece quando `hasIdentity` é verdadeiro.
- [ ] Justificativa de 50 a 2.000 caracteres, com aviso de que o pedido e cada visualização ficam na auditoria.
- [ ] Com um pedido pendente, mostra o status em vez de um novo formulário.

### BIDV-02 · Fila de pedidos do DPO

**Estimativa:** P · **Marco:** Produção · **Depende de:** BAUTH-05, IDV-03

- **Telas e componentes:** rota nova `/identidade/pedidos`, só para `DPO`.
- **Endpoints:** `GET /api/admin/v1/identity-reveal-requests?status=`.

**Critérios de aceite**

- [ ] Lista protocolo, solicitante, data do pedido e status, com filtro por status.
- [ ] Abre o pedido com a justificativa e um link para a denúncia (somente leitura, decisão D20).

### BIDV-03 · Aprovar ou rejeitar

**Estimativa:** M · **Marco:** Produção · **Depende de:** BIDV-02, IDV-04

- **Endpoints:** `POST /api/admin/v1/identity-reveal-requests/:id/approval` e `.../rejection`.

**Critérios de aceite**

- [ ] Quem fez o pedido não vê os botões de decisão no próprio pedido. Se tentar pela API, o 403 é tratado.
- [ ] Aprovar mostra a duração da janela (`identityReveal.windowMinutes`) e pede confirmação.

### BIDV-04 · Ver a identidade dentro da janela

**Estimativa:** M · **Marco:** Produção · **Depende de:** BIDV-01, BIDV-03, IDV-05, IDV-06

- **Endpoints:** `GET /api/admin/v1/identity-reveal-requests/:id/identity`.

**Critérios de aceite**

- [ ] Só o solicitante, só com o pedido aprovado e só dentro da janela, com contagem regressiva visível.
- [ ] A identidade só é buscada quando a pessoa clica em "Mostrar identidade". Um aviso lembra que cada clique é
      auditado.
- [ ] Ao fim da janela, ao sair da aba ou ao encerrar a sessão, a identidade some da tela e da memória.
- [ ] Nada da identidade vai para a URL, o título da página ou o console.
