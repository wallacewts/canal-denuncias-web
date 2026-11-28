# 02 · Portal: protocolo e consulta

**Objetivo:** entregar o protocolo e a chave uma única vez e permitir que o denunciante volte depois com eles, sem
conta e sem nada guardado no navegador.

**Depende de (backend):** REP-02, PUB-01, PUB-02, PUB-04.

**Telas existentes:** `features/new-report/protocol-issued-page.ts` (`/nova-denuncia/protocolo`),
`features/tracking/tracking-access-page.ts` (`/consultar`).

---

### PACC-01 · Tela do protocolo gerado

**Estimativa:** M · **Marco:** MVP · **Depende de:** PNEW-06

**Critérios de aceite**

- [x] Mostra protocolo e chave uma única vez, a partir da memória. Recarregar a página mostra só um aviso de que eles
      não podem mais ser exibidos.
- [x] Botões de copiar cada um (com retorno visual e anunciado) e de baixar um `.txt` gerado no próprio navegador, sem
      chamada ao servidor.
- [x] Aviso claro de que não existe recuperação da chave.
- [x] A pessoa precisa marcar "Guardei o protocolo e a chave" antes de sair da tela pelo botão. Ao sair, protocolo e
      chave são apagados da memória.
- [x] Protocolo e chave nunca aparecem na URL, no título da página nem no console.

> Feature 002: implementado e testado contra o servidor simulado (`tools/mock-api`). A integração com a API real é a T050, bloqueada por CAT-01 e REP-02.

### PACC-02 · Consultar denúncia

**Estimativa:** M · **Marco:** MVP · **Depende de:** FTRV-03, PUB-01

- **Endpoints:** `POST /api/public/v1/tracking/sessions` com corpo `{ protocol, accessKey }`.

**Critérios de aceite**

- [ ] Formulário com protocolo e chave. A chave fica num campo do tipo senha com botão de mostrar.
- [ ] O protocolo aceita minúsculas e falta de hífens, e é normalizado antes do envio.
- [ ] Erro sempre com a mesma mensagem genérica ("Protocolo ou chave inválidos"), inclusive para denúncia encerrada
      ou expurgada.
- [ ] Com sucesso, guarda o token em memória (PACC-03) e vai para `/acompanhamento`.

### PACC-03 · Sessão do denunciante em memória

**Estimativa:** P · **Marco:** MVP · **Depende de:** PACC-02, PUB-02

- **Telas e componentes:** serviço `ReporterSession`, guard de `/acompanhamento`.

**Critérios de aceite**

- [ ] O token fica só em memória. Recarregar a página encerra o acesso e volta para `/consultar`.
- [ ] O guard de `/acompanhamento` manda para `/consultar` quando não há token.
- [ ] Ao expirar (15 minutos, PUB-01) ou receber 401, limpa os dados da denúncia da memória e volta para `/consultar`
      com uma mensagem.
- [ ] Botão "Sair" limpa o token e os dados da tela.

### PACC-04 · Encerrar o acesso no servidor

**Estimativa:** P · **Marco:** Produção · **Depende de:** PACC-03, PUB-04

- **Endpoints:** `DELETE /api/public/v1/tracking/sessions/current`.

**Critérios de aceite**

- [ ] "Sair" chama o endpoint antes de limpar a memória. Se a chamada falhar, a memória é limpa do mesmo jeito.
