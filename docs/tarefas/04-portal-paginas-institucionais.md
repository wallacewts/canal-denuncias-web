# 04 · Portal: páginas institucionais

**Objetivo:** explicar o canal, as garantias de anonimato e o tratamento dos dados, para que a pessoa confie antes de
denunciar.

**Depende de (backend):** nenhum endpoint.

**Telas existentes:** `features/home/home-page.ts` (`/`), `features/privacy/privacy-notice-page.ts` (`/privacidade`),
`features/help/help-page.ts` (`/ajuda`).

---

### PINF-01 · Início

**Estimativa:** P · **Marco:** MVP

**Critérios de aceite**

- [x] Explica o que pode ser relatado (vazamento, prática inadequada, atividade suspeita) e quem pode relatar.
- [x] Explica as garantias: sem cadastro, sem registro de IP, relato cifrado, identidade opcional e lacrada.
- [x] Botões "Fazer uma denúncia" e "Consultar uma denúncia".
- [x] Recomendação de usar um dispositivo e uma rede pessoais quando a pessoa quiser mais anonimato.

> Feature 002: concluído.

### PINF-02 · Aviso de privacidade

**Estimativa:** M · **Marco:** Produção

**Critérios de aceite**

- [ ] Texto validado pelo jurídico e pelo DPO: finalidade, base legal, dados coletados, quem acessa, prazos de
      retenção por desfecho, backups mantidos por tempo indeterminado (decisão D26), direitos do titular e contato do
      encarregado.
- [ ] Data e versão do texto visíveis na página.
- [ ] Link para o aviso no rodapé de todas as telas e na revisão do envio (PNEW-06).

### PINF-03 · Ajuda e perguntas frequentes

**Estimativa:** P · **Marco:** Produção

**Critérios de aceite**

- [ ] Responde: o que acontece depois do envio, quanto tempo leva, o que fazer se perder a chave, se a equipe sabe
      quem eu sou, como responder a uma pergunta da equipe.
- [ ] Perguntas em componente de acordeão acessível por teclado.

### PINF-04 · Página não encontrada e indisponibilidade

**Estimativa:** P · **Marco:** Produção

**Critérios de aceite**

- [ ] Rota desconhecida mostra uma página 404 com links para o início, em vez de redirecionar sem aviso.
- [ ] API fora do ar mostra uma mensagem de indisponibilidade e orienta a tentar mais tarde, sem perder o rascunho em
      memória.
