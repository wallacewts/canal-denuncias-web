# 01 · Portal: nova denúncia

**Objetivo:** o wizard que o denunciante usa para relatar o incidente, do tipo de denunciante até o envio. O rascunho
fica só em memória e nada do relato passa pela URL.

**Depende de (backend):** CAT-01, REP-02. Anexos e identificação dependem de ATT-02 e IDV-01.

**Telas existentes:** `features/new-report/new-report-wizard.ts`, `steps/*`, `review-page.ts` (rotas
`/nova-denuncia/*`).

---

### PNEW-01 · Rascunho em memória e navegação do wizard

**Estimativa:** M · **Marco:** MVP · **Depende de:** FTRV-10

- **Telas e componentes:** `NewReportWizard`, store do rascunho, guard das etapas.

**Critérios de aceite**

- [ ] O rascunho vive só em memória. A URL leva apenas o nome da etapa (`/nova-denuncia/relato`).
- [ ] Não é possível pular etapas obrigatórias pela URL: o guard volta para a primeira etapa pendente.
- [ ] Recarregar ou fechar a aba avisa que o rascunho será perdido (`beforeunload`). Isso é intencional: nada é salvo
      no navegador.
- [ ] Indicador de progresso com o nome e o número da etapa, acessível a leitor de tela.
- [ ] Anexos e identificação ficam ocultos enquanto PNEW-07 e PNEW-08 não estiverem prontas.

### PNEW-02 · Etapa: tipo de denunciante

**Estimativa:** P · **Marco:** MVP · **Depende de:** PNEW-01

**Critérios de aceite**

- [ ] Opções Colaborador, Parceiro e Terceiro, enviadas como `EMPLOYEE`, `PARTNER` e `THIRD_PARTY`.
- [ ] Texto explica que a escolha não identifica a pessoa.

### PNEW-03 · Etapa: categoria

**Estimativa:** P · **Marco:** MVP · **Depende de:** PNEW-01, CAT-01

- **Endpoints:** `GET /api/public/v1/categories`.

**Critérios de aceite**

- [ ] Mostra nome e descrição de cada categoria ativa, na ordem da API.
- [ ] Estados de carregamento e de erro, com opção de tentar de novo.

### PNEW-04 · Etapa: relato

**Estimativa:** M · **Marco:** MVP · **Depende de:** PNEW-01, REP-02

Campos de `ReportContentV1`: descrição, quando aconteceu, onde, sistemas afetados, tipos de dados, como soube e
evidências.

**Critérios de aceite**

- [ ] Descrição obrigatória de 100 a 10.000 caracteres, com contador. Demais textos até 2.000, como em REP-02.
- [ ] "Quando aconteceu" aceita data exata ou só mês e ano.
- [ ] Tipos de dados em seleção múltipla (dados pessoais, financeiros, credenciais, outros).
- [ ] Orientação curta: descrever fatos, e não incluir dados que identifiquem quem denuncia se a pessoa quer ficar
      anônima.
- [ ] Mensagens de validação ligadas aos campos e anunciadas (FTRV-07).

### PNEW-05 · Etapa: envolvidos

**Estimativa:** P · **Marco:** MVP · **Depende de:** PNEW-01

**Critérios de aceite**

- [ ] Etapa opcional. Até 20 envolvidos, cada um com nome e função opcionais.
- [ ] Adicionar e remover por teclado, com o foco indo para a linha nova.

### PNEW-06 · Revisão e envio

**Estimativa:** M · **Marco:** MVP · **Depende de:** PNEW-02 a PNEW-05, REP-02

- **Telas e componentes:** `ReviewPage`.
- **Endpoints:** `POST /api/public/v1/reports`.

**Critérios de aceite**

- [ ] Mostra tudo o que será enviado, com link para editar cada etapa.
- [ ] Link para o aviso de privacidade antes do botão de enviar.
- [ ] O botão fica desabilitado durante o envio (sem envio duplicado).
- [ ] Com 201, guarda `protocol`, `accessKey` e `receivedOn` só em memória, limpa o rascunho e vai para
      `/nova-denuncia/protocolo` (PACC-01).
- [ ] Com erro, o rascunho continua intacto e a mensagem segue FTRV-02.

### PNEW-07 · Etapa: anexos

**Estimativa:** M · **Marco:** Produção · **Depende de:** PNEW-06, PACC-03, ATT-02

Os arquivos são escolhidos no wizard e enviados logo depois da criação da denúncia, com o token de acompanhamento
aberto automaticamente com o protocolo e a chave recém-criados.

- **Endpoints:** `POST /api/public/v1/tracking/sessions`, `POST /api/public/v1/me/attachments`.

**Critérios de aceite**

- [ ] Validação no navegador igual à da API (ATT-01): até 5 arquivos, 10 MB cada, PDF, PNG, JPEG e TXT.
- [ ] Texto avisa que metadados (autor, GPS) são removidos no servidor e sugere conferir o arquivo antes.
- [ ] Progresso por arquivo. Se algum falhar, a tela do protocolo informa e orienta a reenviar pelo acompanhamento.
- [ ] O nome do arquivo não aparece na URL nem no console.

### PNEW-08 · Etapa: identificação opcional

**Estimativa:** M · **Marco:** Produção · **Depende de:** PNEW-01, IDV-01

- **Endpoints:** campo `identity` em `POST /api/public/v1/reports`.

**Critérios de aceite**

- [ ] A opção padrão é "Não quero me identificar".
- [ ] Explica que a identidade fica lacrada, que só é revelada com justificativa e aprovação de outra pessoa, e que
      toda revelação é auditada.
- [ ] Campos: nome, contato e cargo, todos opcionais. A revisão mostra se a pessoa se identificou.
