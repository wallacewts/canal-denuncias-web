# Research: Base transversal do front

**Feature**: [spec.md](./spec.md) · **Data**: 2026-11-27

Versões conferidas no npm e no registro de imagens em 2026-11-27. O workspace usa Angular 22.3, zoneless, Vitest e
CSP com nonce + Trusted Types (`trusted-types angular angular#bundler`).

---

## R1. Gerador do cliente da API (FTRV-01)

**Decision**: `ng-openapi-gen` **1.1.0**, gerando **dois clientes**, um a partir de `openapi/public.json` (rotas
`/api/public/v1`, tag `public`, usado pelo portal) e outro a partir de `openapi/admin.json` (rotas `/api/admin/v1`, tag
`admin`, usado pelo backoffice), no modo padrão da versão 1.x
(uma função por operação, sem `NgModule`, Observables).

**Rationale**:

- **Superfície menor.** É uma ferramenta só de Angular, com poucas dependências diretas (handlebars, lodash, json-schema-ref-parser,
  entre outras). O `orval` 8.49 traz junto os geradores de todos os clientes que suporta (axios, fetch, swr, hono, mcp,
  zod, valibot, pinia, solid...). Como é uma dependência de desenvolvimento, isso não chega ao bundle, mas aumenta a
  cadeia de fornecimento sem nenhum ganho para o projeto (constituição, princípio VIII).
- **Compatível com o que já existe.** O código gerado usa `HttpClient`, então passa pelos interceptors (`api:`, erros,
  credenciais) e pelo XSRF do Angular. Nada usa `eval` nem `innerHTML`, então não conflita com a CSP nem com Trusted
  Types. Funciona sem zone.js, porque não depende de detecção de mudanças.
- **Bundle do portal enxuto.** Com uma função por operação, só entra no bundle o que a tela importa. Separar os clientes por
  tag permite uma regra de lint que proíbe o portal de importar o cliente `admin` (princípio V: o portal não importa
  código do backoffice).
- **Geração offline.** Lê um arquivo local. O único risco de rede seria um `$ref` remoto no documento, que a API não
  gera. O teste de CI roda a geração sem rede.
- Compatível com Angular 16 ou superior e com OpenAPI 3.1 desde a versão 1.0. Peer deps: `@angular/core >=16`,
  `rxjs >=6.5`.

**Alternatives considered**:

- **`orval` 8.49**: gera clientes Angular com `HttpClient` e, como diferencial, mocks (MSW) e schemas zod. Os mocks não
  são necessários: os testes unitários usam `HttpTestingController` e os e2e usam a API real. Foi descartado pela cadeia
  de dependências muito maior e pelo ritmo de releases alto (8.49 em novembro de 2026), que aumenta o trabalho de
  revisão do Dependabot.
- **Escrever à mão**: proibido pela constituição (princípio V) e pelo FTRV-01.

**Detalhes**:

- As entradas são `openapi/public.json` e `openapi/admin.json`, versionadas no repositório. A API grava os dois com
  `npm run openapi:export` (TRV-11) em `../canal-denuncias-api/openapi/`, e o CI dela falha se estiverem desatualizados.
  O script `npm run api:sync` copia os dois arquivos do repositório local da API (padrão) ou de um diretório informado
  (`--from <dir>`, usado com o artefato do CI da API). O CI do front regera os clientes e falha com
  `git diff --exit-code` se algo mudar.
- Por virem de arquivos separados, o cliente do portal nunca contém operações administrativas, nem como tipo.
- `rootUrl` dos clientes é `api:` (o `apiInterceptor` troca pelo `apiBaseUrl`).
- Saída em `projects/shared/src/lib/api/generated/public/` e `.../admin/`, fora do lint e do Prettier, e com um
  cabeçalho de "arquivo gerado".
- **Dependência do backend**: as tarefas de sincronização e geração ficam bloqueadas até a API implementar o
  `npm run openapi:export` (TRV-11).

---

## R2. Padrão de estado (FTRV-10)

**Decision**: **serviços com signals do próprio Angular** (`signal`, `computed`, `linkedSignal`, `resource`/`httpResource`),
sem `@ngrx/signals` por enquanto. Critério registrado para reavaliar: adotar o SignalStore quando uma tela tiver estado
com mais de uma fonte assíncrona e regras de atualização compartilhadas por mais de um componente (o candidato provável é
a caixa de denúncias do backoffice, com filtros, paginação por cursor e atualização após mudar status).

**Rationale**:

- Nesta feature o estado é pequeno: a credencial do denunciante em memória, os avisos de erro e a configuração. Um
  serviço com um `signal` resolve tudo com menos código e sem nova dependência (princípio VIII).
- Os signals nativos são o modelo de reatividade do Angular 22 zoneless. Não exigem nada a mais para funcionar sem zone.js.
- Descartar estado sensível ao sair da tela fica explícito: serviços com `providedIn` no componente de rota (escopo da
  tela) são destruídos junto com a rota, e o serviço global da sessão do denunciante tem um `clear()` chamado no 401 e ao
  sair do acompanhamento.
- Nada é persistido no navegador. O lint já proíbe `localStorage`, `sessionStorage` e `document.cookie`, e um teste e2e
  confere o armazenamento vazio.

**Alternatives considered**:

- **`@ngrx/signals` 22.0.1**: compatível (peer `@angular/core ^22`), sem `eval` e sem conflito com a CSP. Traz
  `withEntities`, `withHooks` e métodos com `rxMethod`, que ajudam em telas complexas. Fica como opção para quando o
  critério acima for atingido. Adotar agora seria dependência sem uso real nesta feature.
- **NgRx Store clássico**: verboso demais para o tamanho do app.

---

## R3. Testes de ponta a ponta (FTRV-06) no Ubuntu 20.04

**Decision**: **Playwright 1.65.1** (`@playwright/test`), rodando **sempre dentro do container oficial**
`mcr.microsoft.com/playwright:v1.65.1-noble`, tanto localmente quanto no CI. O script `npm run e2e` sobe o compose dos
apps e roda os testes num serviço `e2e` adicional (`docker-compose.e2e.yml`), na mesma rede dos apps, acessando
`http://portal:8080` e `http://backoffice:8080`.

**Rationale**:

- O Playwright não suporta o Ubuntu 20.04 das máquinas atuais. A imagem oficial traz os navegadores (Chromium,
  Firefox) e as bibliotecas de sistema já compatíveis, e a versão da imagem fica fixada igual à do pacote npm.
- Os mesmos testes rodam igual no CI (`ubuntu-latest`) e na máquina de cada pessoa.
- Chromium e Firefox na mesma execução atendem à validação da CSP em dois navegadores (FTRV-05).

**Guardas de privacidade (fixture comum a todos os testes)**:

- Rede: `page.on('request')` reprova qualquer URL cuja origem não seja a do app.
- URL: em cada navegação, reprova se a URL contém um protocolo, chave ou trecho de relato usados no teste.
- CSP: um script de inicialização (`addInitScript`, injetado pelo protocolo de depuração e por isso fora do alcance
  da CSP da página) registra eventos `securitypolicyviolation`. O teste reprova se houver algum. Mensagens de console
  com "Content Security Policy" ou "Trusted Type" também reprovam.
- Armazenamento: ao fim de cada fluxo, `localStorage`, `sessionStorage` e `indexedDB.databases()` precisam estar vazios.
- O contexto nunca usa `bypassCSP`. É justamente a CSP real que está sendo testada.

**Acessibilidade (FTRV-07)**: `@axe-core/playwright` 4.14.1 nas rotas do portal, reprovando violações `serious` e
`critical`. O axe é injetado via `evaluate`, que não passa pela CSP de script. Se a Trusted Types bloquear alguma
rotina interna do axe, as verificações de acessibilidade rodam num projeto separado do Playwright, com contexto próprio,
e a guarda de CSP continua ativa nos demais projetos. Essa saída fica registrada no plano.

**Alternatives considered**:

- **Instalar o Playwright no host**: não suportado no Ubuntu 20.04.
- **Cypress**: também exige dependências de sistema no host e tem suporte mais limitado a Firefox e a múltiplas
  origens.
- **Só testes unitários**: não detectam requisição externa, CSP nem armazenamento do navegador.

---

## R4. Mesmo endereço no ambiente local (FTRV-04)

**Decision**: o nginx de cada app passa a ter `location /api/`, que repassa para a API pelo endereço da variável de
ambiente `APP_API_UPSTREAM`. No compose local, o valor é `http://host.docker.internal:3000`, com `extra_hosts:
host-gateway` para funcionar no Linux. O `config.json` dos dois apps passa a `"apiBaseUrl": "/api"`, e a CSP volta a
`connect-src 'self'`.

**Rationale**:

- Reproduz o desenho de produção (proxy reverso no mesmo domínio, TRV-12). Com isso, o cookie `XSRF-TOKEN` fica
  legível pelo Angular, o `X-XSRF-TOKEN` passa a ser enviado e o cookie de sessão `SameSite=Strict` funciona.
- **Anonimato no proxy do portal**: o `location /api/` do portal remove `X-Forwarded-For`, `X-Real-IP` e `Forwarded`
  (`proxy_set_header ... ""`) e mantém `access_log off`. Assim o IP do denunciante nunca chega à API (princípio I da
  constituição, nos dois repositórios). O backoffice repassa o IP real, porque a API audita o IP da equipe (D25,
  AUDIT-03).
- A variável `APP_CSP_CONNECT_SRC` deixa de existir: com tudo no mesmo endereço, `connect-src 'self'` é fixo, o que
  reduz configuração e risco.

**Alternatives considered**:

- **Proxy do dev server do Angular (`proxy.conf.json`)**: já existe para `ng serve`, mas não testa o nginx nem a CSP
  reais. Continua valendo só para o desenvolvimento rápido.
- **Manter CORS com a API em outro domínio**: o XSRF do Angular não funciona entre domínios diferentes, e esse não é o
  desenho de produção.

---

## R5. Tratamento de erros (FTRV-02)

**Decision**: um `errorInterceptor` funcional na lib compartilhada, que converte `HttpErrorResponse` num `ApiError`
tipado (`{ statusCode, error, message, requestId }`, TRV-01) e consulta uma tabela única de mensagens em português por
código de status. A exibição fica num `NotificationService` (snackbar do Material, que já anuncia ao leitor de tela pela
própria região ARIA, com o `LiveAnnouncer` do CDK como reforço). Um `ErrorHandler` próprio substitui o padrão para não
escrever objetos de erro no console.

**Rationale**: um único lugar define as mensagens (constituição, princípio IV), e a regra de "nada no console" fica
centralizada e testável. O comportamento no 401 depende do app, então cada app registra a sua ação: o backoffice leva ao
`/login` e o portal limpa a sessão do denunciante e leva a `/consultar`.

**Alternatives considered**: tratar erro em cada tela, o que duplica código e acaba gerando mensagens diferentes para o
mesmo erro; usar `console.error` em desenvolvimento, o que é proibido pela regra de lint FTRV-11.

---

## R6. Credenciais por app (FTRV-03)

**Decision**: `provideApi(config, policy)` recebe a política do app. No backoffice: `withCredentials: true`. No portal:
`withCredentials: false`, e o interceptor anexa `Authorization: Bearer <token>` só em `/public/v1/me/*`, lendo o token de
`ReporterSession`, um serviço com um `signal` em memória.

**Rationale**: o portal não deve enviar nenhum cookie (AUTH-07: o CORS com credenciais vale só para o backoffice), e o
token do denunciante não pode ir para outras rotas.

---

## R7. Tema, componentes base e datas (FTRV-09)

**Decision**: tema Material 3 da lib compartilhada, com tokens próprios (`mat.theme` e variáveis `--mat-sys-*`), usado pelos dois apps.
Componentes standalone em `projects/shared/src/lib/ui/`: `PageHeader`, `EmptyState`, `LoadingState`, `ConfirmDialog`
(sobre `MatDialog`) e `StatusChip` (texto + cor). Pipes `portalDate` (`dd/MM/yyyy`) e `staffDateTime`
(`dd/MM/yyyy HH:mm:ss`, D25), com `LOCALE_ID` `pt-BR` registrado.

**Rationale**: os componentes do Material que injetam estilo (overlay, dialog, snackbar, tooltip) usam o nonce
repassado pelo Angular (`ngCspNonce` já está no `index.html`). A validação no navegador real (FTRV-05) confirma isso.
Nenhum estilo inline com `[style]` em string crua.

---

## R8. Proteção de dados no cliente (FTRV-11)

**Decision**:

- Regra `no-console: error` no ESLint para `projects/*/src` (os testes ficam liberados). O `main.ts` dos dois apps deixa de
  usar `console.error` e só mostra a mensagem de indisponibilidade.
- `sourceMap: false` explícito na configuração de produção dos dois apps.
- `autocomplete="off"` e `spellcheck="false"` como padrão nos componentes de campo sensível, via uma diretiva
  `appSensitiveInput` na lib, aplicada pelas features seguintes.
- O orçamento do bundle inicial do portal cai de 700 kB/1 MB para **400 kB de aviso e 500 kB de erro** (hoje está em ~347 kB),
  para que o crescimento só aconteça com justificativa (princípio VII).

---

## R9. Fases do e2e e da validação de CSP (FTRV-05, 06, 07, 11)

**Contexto**: no backlog do front, FTRV-05, 06, 07 e 11 estão na etapa 7 ("Qualidade do MVP"), mas a spec inclui
todos os FTRV. Os fluxos completos do MVP (enviar denúncia, consultar, login com MFA, triagem) dependem de telas e de
endpoints que ainda não existem.

**Decision (confirmada pelo usuário em 2026-11-27, opção A)**: esta feature entrega a estrutura de e2e (container, fixtures
com as guardas de privacidade e de CSP, axe), a validação de CSP e de acessibilidade em todas as rotas que já existem
(hoje, placeholders), as regras de lint e o orçamento de bundle. Cada feature de tela seguinte acrescenta o seu teste de
fluxo. Os critérios "fluxo do MVP coberto" (FTRV-06) e "todas as rotas sem violação" (FTRV-05, FTRV-07) fecham na etapa 7,
quando as telas existirem.

**Alternatives**: (B) tirar FTRV-05, 06, 07 e 11 desta feature e fazê-los inteiros na etapa 7; (C) manter tudo aqui e
deixar a feature aberta até as telas existirem.
