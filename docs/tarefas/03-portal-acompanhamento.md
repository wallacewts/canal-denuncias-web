# 03 · Portal: acompanhamento

**Objetivo:** o denunciante acompanha o andamento, vê o desfecho e conversa com a equipe sem se identificar.

**Depende de (backend):** PUB-03, MSG-01, MSG-02, ATT-02.

**Telas existentes:** `features/tracking/tracking-page.ts` (`/acompanhamento`).

---

### PTRK-01 · Andamento e desfecho

**Estimativa:** M · **Marco:** MVP · **Depende de:** PACC-03, PUB-03

- **Endpoints:** `GET /api/public/v1/me/report`.

**Critérios de aceite**

- [x] Rótulos de status iguais ao mapeamento de PUB-03: Recebida, Em análise, Aguardando sua resposta, Encerrada e
      Concluída.
- [x] Denúncia concluída mostra o desfecho: Procedente, Parcialmente procedente ou Improcedente (decisão D22).
- [x] Em "Aguardando sua resposta", destaca o prazo para responder e leva direto ao campo de mensagem.
- [x] Linha do tempo só com datas, sem hora e sem nome de quem tratou.
- [x] Mostra a categoria e a data de recebimento. O relato original não é exibido.

> Feature 003: implementado e testado contra o servidor simulado (`tools/mock-api`). A integração com a API real é a T039, bloqueada por PUB-01, PUB-03, MSG-01 e MSG-02.

### PTRK-02 · Mensagens com a equipe

**Estimativa:** M · **Marco:** MVP · **Depende de:** PTRK-01, MSG-01, MSG-02

- **Endpoints:** `GET /api/public/v1/me/messages`, `POST /api/public/v1/me/messages`.

**Critérios de aceite**

- [x] A equipe aparece sempre como "Equipe de apuração". Nenhum nome de analista é exibido.
- [x] Mensagens com data (sem hora), em ordem cronológica, numa lista acessível a leitor de tela.
- [x] Campo de resposta com limite de caracteres e contador. Envio desabilitado durante a requisição.
- [x] Botão "Atualizar" para buscar mensagens novas, anunciadas por `aria-live`.
- [x] Denúncia encerrada mostra as mensagens, mas não aceita novas.
- [x] Aviso, antes de a credencial do denunciante expirar (`ReporterSession.expiresAt`), de que o texto não enviado
      será perdido. Vem do 001-shared-foundation (pendência G2 do analyze).

> Feature 003: implementado e testado contra o servidor simulado (`tools/mock-api`). A integração com a API real é a T039, bloqueada por PUB-01, PUB-03, MSG-01 e MSG-02.

### PTRK-03 · Complementos com anexos

**Estimativa:** M · **Marco:** Produção · **Depende de:** PTRK-02, ATT-02

- **Endpoints:** `POST /api/public/v1/me/attachments` (com `messageId` opcional).

**Critérios de aceite**

- [ ] Mesmas validações e avisos de PNEW-07.
- [ ] O anexo pode ir junto com uma mensagem ou sozinho.
- [ ] Denúncia encerrada não oferece envio de anexo.

### PTRK-04 · Saída segura

**Estimativa:** P · **Marco:** MVP · **Depende de:** PACC-03

**Critérios de aceite**

- [x] Botão "Sair" visível em todas as telas do acompanhamento.
- [x] Ao sair, nenhuma informação da denúncia continua na memória nem na tela, e o botão voltar do navegador não a
      mostra de novo.
- [x] Texto com orientações para computador compartilhado (fechar a aba, não salvar a chave no navegador).

> Feature 003: implementado e testado contra o servidor simulado (`tools/mock-api`). A integração com a API real é a T039, bloqueada por PUB-01, PUB-03, MSG-01 e MSG-02.
