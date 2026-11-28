# Research: Envio de denúncia pelo portal

Decisões técnicas da feature 002. Cada uma traz a decisão, o motivo e as alternativas descartadas. Base: Angular
22.3, Angular Material 22.3, a base transversal da feature 001 e as decisões D34 a D39.

## R1. Respostas simuladas só em teste e desenvolvimento

- **Decision**: as respostas simuladas ficam **fora do código dos apps**, num servidor HTTP simulado próprio
  (`tools/mock-api/server.mjs`), que responde a `GET /api/public/v1/categories` e `POST /api/public/v1/reports`
  com os formatos de CAT-01 e REP-02. Ele é usado em três lugares:
  - **e2e**: substitui o servidor de eco como upstream de `/api` no `docker-compose.e2e.yml`. O servidor de eco é
    absorvido por ele (as rotas `/fixture/*` e o eco continuam respondendo como hoje), então os testes de proxy da
    feature 001 não mudam. O e2e roda contra o **build de produção** servido pelo nginx, como na feature 001.
  - **desenvolvimento**: `npm run dev:mock-api` sobe o mesmo servidor na porta 3000, para onde o `proxy.conf.json` do
    `ng serve` já aponta.
  - **unitários**: `HttpTestingController` do Angular, sem servidor.

  Cenários controlados por um endpoint só do simulador (`POST /__mock/scenario`, com `categories: ok | empty | error`
  e `submit: ok | invalid | error | slow`), chamado pelo próprio teste antes de abrir a página.

- **Como o build prova que nada simulado entrou**: o simulador usa valores-sentinela inconfundíveis (protocolo
  `DV-SIMUL-ADO00`, códigos de categoria com prefixo `SIMULADA_`, chave começando com `SIMULADA`). O
  `scripts/check-build-output.mjs` passa a reprovar o build se encontrar `SIMULADA`, `DV-SIMUL`, `mock-api` ou
  `__mock` em qualquer arquivo de `dist/`. Uma regra de lint (`no-restricted-imports`) impede `projects/**` de
  importar `tools/**` e `e2e/**`. O teste do próprio script prova que ele reprova um build com o sentinela.
- **Rationale**: o código simulado nunca chega ao bundle porque nunca é importado pelos apps. O e2e continua
  testando exatamente o que vai para produção (nginx, CSP com nonce, proxy sem IP), só com a API trocada.
- **Alternatives considered**:
  - Interceptor HTTP simulado nos apps, ligado por `environment`/`fileReplacements`: o código simulado ficaria no
    repositório dos apps e dependeria de configuração de build para não vazar; um erro de configuração poria
    respostas falsas em produção.
  - `page.route()` do Playwright: funciona só no e2e, não ajuda no desenvolvimento local e intercepta antes do nginx,
    pulando o proxy `/api` e seus testes de cabeçalho.
  - MSW (Mock Service Worker): service worker no navegador, conflita com a CSP estrita e acrescenta dependência.

## R2. Tipos provisórios até o contrato da API ter os endpoints

- **Decision**: tipos internos marcados como provisórios (`ProvisionalCategory`, `ProvisionalReportSubmission`,
  `ProvisionalReportReceipt`) num único arquivo da feature, com validação em tempo de execução das respostas
  (`toCategories(unknown)`, `toReceipt(unknown)`). Uma tarefa bloqueada (⛔ CAT-01, REP-02) troca os tipos e as
  chamadas pelo cliente gerado e remove os provisórios, como o `ProvisionalApiError` da feature 001.
- **Rationale**: a constituição (princípio V) pede o cliente gerado, mas o contrato ainda não tem os endpoints
  (opção A do usuário). A validação em tempo de execução impede que uma resposta inesperada vire dado na tela.
- **Alternatives considered**: escrever as rotas no contrato à mão (proibido: o contrato é gerado pela API);
  esperar a API (descartado pelo usuário).
- **Impacto**: registrado em "Complexity Tracking" no plano.

## R3. Estado do rascunho e da tela do protocolo

- **Decision**: uma rota-pai `nova-denuncia` com um componente de fluxo (`NewReportFlow`) que **fornece** dois estados
  com escopo de tela (padrão `ScreenState` da D35): `ReportDraftState` (o formulário do rascunho) e `ReceiptState`
  (protocolo, chave e data). As etapas, a revisão e a tela do protocolo passam a ser **filhas** dessa rota. Sair de
  `/nova-denuncia/*` destrói o componente e descarta os dois estados.
- **Rationale**: hoje a revisão e o protocolo são rotas irmãs do wizard e perderiam o estado. Estado em serviço
  `providedIn: 'root'` sobreviveria à saída da tela e dependeria de limpeza manual. Providers de rota (`providers` no
  objeto da rota) também sobrevivem à saída: o injetor da rota fica em cache.
- **Alternatives considered**: `@ngrx/signals` (descartado pela D35 até haver várias fontes assíncronas);
  serviço global com `clear()` em todo caminho de saída (frágil).

## R4. Formulários tipados por etapa

- **Decision**: Reactive Forms tipados (`NonNullableFormBuilder`). O `ReportDraftState` guarda um único `FormGroup`
  com um subgrupo por etapa (`reporterType`, `category`, `content`, `involved` como `FormArray`). Cada etapa recebe o
  seu subgrupo. A validade de cada subgrupo diz se a etapa está completa. A revisão lê `getRawValue()`, e o corpo do
  envio é montado por uma função pura (`toSubmission(draft)`) com teste próprio. Os validadores repetem os limites de
  REP-02 (100 a 10.000, 2.000, 20 envolvidos) e recusam data futura.
- **Rationale**: a constituição fixa Reactive Forms tipados (princípio V). Um formulário só com subgrupos mantém os
  valores ao voltar e avançar e dá a validade por etapa de graça.
- **Alternatives considered**: Signal Forms (`@angular/forms/signals`, presente no Angular 22) exigiriam mudar a
  constituição; um formulário independente por etapa obrigaria a copiar valores entre etapas.

## R5. Impedir pular etapas

- **Decision**: a verificação fica no `NewReportFlow`, não em guards de rota. A cada navegação concluída dentro do
  fluxo, ele calcula a primeira etapa obrigatória incompleta e, se a etapa pedida vier depois dela, navega para a
  pendente com `replaceUrl`. A ordem e a obrigatoriedade das etapas ficam numa tabela única (`WIZARD_STEPS`), usada
  também pelo indicador de progresso.
- **Rationale**: guards de rota rodam no injetor da rota e não enxergam serviços fornecidos pelo componente (R3).
- **Alternatives considered**: guard `canActivate` com estado global (contradiz R3).

## R6. Aviso de saída

- **Decision**:
  - **Recarregar ou fechar a aba**: `beforeunload` registrado pelo `NewReportFlow` só enquanto houver rascunho com
    dados ou comprovante na memória (o navegador mostra o texto padrão dele).
  - **Navegar para fora do fluxo**: guard funcional `canDeactivate` na rota-pai. Ele recebe a instância do componente,
    então lê o estado. Navegação dentro de `/nova-denuncia/*` passa; para fora, com rascunho preenchido, abre o
    `ConfirmDialog` da lib (já existente). Depois de um envio com sucesso, o rascunho já está vazio e não há aviso.
  - **Tela do protocolo**: guard `canDeactivate` na rota filha `protocolo`. Sair sem marcar "Guardei" pede
    confirmação (cobre o botão voltar do navegador). O botão "Concluir" só habilita depois da marcação.
- **Rationale**: cobre os três caminhos de saída (aba, link, histórico) sem guardar nada no navegador.

## R7. Arquivo `.txt` gerado no navegador

- **Decision**: `new Blob([texto], { type: 'text/plain;charset=utf-8' })`, `URL.createObjectURL`, um `<a>` criado por
  `document.createElement` com `download="comprovante-denuncia.txt"`, clique programático e `URL.revokeObjectURL` logo
  em seguida. O nome do arquivo é fixo: não leva protocolo nem chave (FR-035).
- **CSP e Trusted Types**: `href` de âncora não é um sink de Trusted Types (`require-trusted-types-for 'script'`
  cobre HTML, script e URL de script) e o download não passa por `connect-src`. Nada de `innerHTML`, `data:` ou
  script inline. O e2e confirma nos dois navegadores, com a guarda de CSP ativa e o evento de download do Playwright
  conferindo o conteúdo.
- **Alternatives considered**: `data:` URL (exigiria liberar `data:` em outro contexto e expõe o conteúdo na URL do
  link); geração no servidor (proibida pelo critério de aceite).

## R8. Temporizador de inatividade

- **Decision**: `InactivityTimer`, serviço com escopo do `NewReportFlow`. Conta atividade por `keydown`, `pointerdown`
  e navegação concluída dentro do fluxo (eventos passivos, sem guardar o que foi digitado). Aos 25 minutos abre o
  `ConfirmDialog` ("Continuar"); continuar reinicia a contagem. Aos 30 minutos apaga o rascunho, fecha o diálogo e
  navega para `/nova-denuncia/tipo` com um aviso ("O rascunho foi apagado depois de 30 minutos sem atividade."). Os
  tempos são constantes num só lugar e injetáveis, para os testes.
- **Testes**: unitários com os timers falsos do Vitest; e2e com `page.clock` do Playwright para avançar o relógio.
- **Rationale**: decisão do usuário (Q1, opção B). Escopo de tela: some junto com o fluxo, sem timers soltos.
- **Tela do protocolo (Q-P1, confirmada)**: a mesma regra apaga protocolo e chave aos 30 minutos.

## R9. Campo "quando aconteceu"

- **Decision**: um grupo de opções "Data exata" ou "Só mês e ano". Data exata usa `<input type="date">` nativo, com
  `max` igual a hoje. Mês e ano usam dois `<select>` nativos dentro de `mat-form-field` (`matNativeControl`). Sem o
  datepicker do Material.
- **Rationale**: o Firefox não implementa `<input type="month">`. O datepicker do Material pesa no bundle e injeta
  estilos em sobreposição, que ainda precisam da validação de CSP (T027). Controles nativos são acessíveis e leves.
- **Alternatives considered**: `MatDatepicker` (peso e estilos injetados); `type="month"` (sem suporte no Firefox).

## R10. Aviso de privacidade a partir da revisão

- **Decision**: o texto do aviso sai da página `/privacidade` para um componente reutilizável (`PrivacyNoticeContent`),
  usado pela página e por um diálogo aberto a partir da revisão. Navegar para `/privacidade` destruiria o fluxo e o
  rascunho (R3).
- **Alternatives considered**: abrir `/privacidade` em nova aba (outra instância do app, mas exige `target="_blank"`
  e tira a pessoa do contexto); navegar e confiar no aviso de saída (pior experiência).

## R11. Copiar para a área de transferência

- **Decision**: `navigator.clipboard.writeText` dentro do clique. Sucesso: retorno visual no botão e anúncio por
  região `aria-live`. Falha (permissão negada, contexto inseguro): mensagem orientando a selecionar e copiar; o valor
  continua visível e selecionável, com `user-select: all`.

## R12. Impacto no bundle

- **Decision**: todo o código novo fica nos chunks preguiçosos de `/nova-denuncia` e da página inicial. Meta: bundle
  inicial do portal com no máximo **+5 kB** (hoje 373,7 kB, orçamento 400 kB; limite prático 380 kB) e chunks do fluxo
  somando no máximo **150 kB** sem compressão. Os módulos do Material previstos (form-field, input, radio, checkbox,
  button) são os maiores itens. O diálogo já é carregado sob demanda pela lib. A medição entra no relatório de cada
  fase do implement.
