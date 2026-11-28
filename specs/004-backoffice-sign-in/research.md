# Research: Acesso da equipe ao backoffice (feature 004)

Fontes lidas antes das decisões: `canal-denuncias-api/docs/adr/0053-autenticacao-e-autorizacao.md` (inclusive a seção
"O que já existe e o que cada tarefa seguinte constrói", atualizada pelo backend na US4 da feature 004 dele),
`docs/tarefas/04-auth.md` (premissas de contrato do login já registradas pelo backend), `docs/tarefas/03-users.md`
(USERS-07 com permissões efetivas e horários de expiração), `.claude/skills/nestjs-auth/references/authentication.md` e
o código da proteção nativa contra escrita de outra origem em `@nestjs/core/security/cross-origin-protection.js`.

## R1 · Estado da sessão no front, sem armazenamento do navegador

- **Decisão:** um serviço `StaffSession` (raiz do backoffice) guarda só em memória, em signals: o usuário atual
  (resposta de `GET /me`), o conjunto de permissões efetivas, os horários de expiração (inatividade e absoluta) e o
  motivo do último encerramento. Nenhum token: a sessão é o cookie `HttpOnly` da API, que o front não lê. Ao recarregar
  a página, a memória some, mas o cookie continua válido: o guard (R4) chama `GET /me` uma vez para restaurar o
  usuário; 401 leva ao login.
- **Motivo:** diferente do portal (D39, credencial do denunciante só em memória e recarregar encerra), o backoffice usa
  cookie de sessão no servidor (D53), que sobrevive ao recarregar. Restaurar por `/me` evita qualquer armazenamento
  local e mantém a API como fonte.
- **Encerramento único:** `StaffSession.end(reason)` (expiração por inatividade, limite absoluto, 401, saída, outra aba)
  limpa usuário, permissões, horários e todos os `ScreenState` (que vivem nos componentes de rota e somem com a
  navegação para `/login` com `replaceUrl`), avisa as outras abas (R2) e navega para `/login`. O motivo aparece só na
  tela de login (região `role="status"`), como o `endReason` do portal (feature 003), nunca como snackbar.
- **401:** a política do backoffice passa a `silentUnauthenticated: true` e `onUnauthenticated` chama
  `StaffSession.end('unauthenticated')`, para não haver mensagem dupla (mesmo padrão do portal).
- **Alternativas:** guardar o usuário em `sessionStorage` para sobreviver ao recarregar (proibido pela constituição e
  pelo `AGENTS.md`); reaproveitar a `ReporterSession` da lib (é do denunciante e tem semântica de token em memória).

## R2 · Sincronização entre abas sem armazenamento

- **Decisão:** `BroadcastChannel('canal-backoffice-session')`, criado pelo `StaffSession`. Mensagens só de evento, sem
  dados: `{ type: 'activity', at }` (houve chamada bem-sucedida à API), `{ type: 'ended', reason }`. Ao receber
  `ended`, a aba roda o próprio encerramento sem reenviar a mensagem. Ao receber `activity`, adia o aviso de
  inatividade. Sem `BroadcastChannel` (navegador antigo), cada aba depende do próprio relógio e do 401 da API.
- **Motivo:** a regra do `AGENTS.md` e da constituição proíbe `localStorage`, `sessionStorage`, IndexedDB e
  `document.cookie`; `BroadcastChannel` não armazena nada (mensagem efêmera entre contextos da mesma origem, perdida se
  nenhuma aba escuta) e é o mecanismo citado no próprio BAUTH-06. Não carrega nenhum dado de denúncia nem do usuário.
- **Alternativas:** evento `storage` do `localStorage` (proibido); `SharedWorker` (mais complexo e sem ganho);
  polling de `/me` em cada aba (gera uso que mantém a sessão viva e contraria o USERS-07).

## R3 · Avisos de inatividade e do limite de 8 horas

- **Decisão:**
  - **Absoluto:** `absoluteExpiresAt` vem da API (login, desafio e `/me`) e não muda. Aviso 60 s antes, sem
    "Continuar" (só "Sair" e a orientação de que será preciso entrar de novo). No horário, encerramento com
    `reason: 'absolute'`.
  - **Inatividade:** a janela de inatividade é derivada da própria resposta da API (`idleExpiresAt` menos o instante
    da resposta), sem o número 15 escrito no front. Toda resposta 2xx de uma chamada administrativa marca atividade
    (interceptor de atividade do backoffice) e reprograma a expiração esperada como `última atividade + janela − 60 s`
    de margem, porque a API grava o último uso no máximo uma vez por minuto (`touchInterval`, AUTH-02) e o horário real
    pode vir até 1 min antes. Aviso 60 s antes da expiração esperada, com "Continuar" e "Sair".
  - **"Continuar"** chama `GET /me` (ação da pessoa, que renova a sessão e devolve horários novos). O front nunca chama
    `/me` sozinho para manter a sessão viva (USERS-07).
  - **Relógio:** os temporizadores usam `Date.now()` corrigido pela diferença entre o relógio da máquina e o cabeçalho
    `Date` da resposta que trouxe os horários, para que um relógio local errado não antecipe nem atrase os avisos.
- **Motivo:** a API é a fonte dos horários (Q2 = A); a margem de 60 s evita que o aviso apareça depois que o servidor já
  expirou a sessão. O aviso é uma faixa com `role="alert"`, não modal, para não tirar o foco de quem digita (mesmo
  padrão do portal, R6 da feature 003).
- **Alternativas:** pedir à API cabeçalhos de expiração em toda resposta (mais preciso, mas não está no backlog; fica
  como evolução se a margem se mostrar insuficiente); controlar só pelo 401 (a pessoa perderia texto sem aviso).

## R4 · Guards de rota por permissão

- **Decisão:**
  - `authGuard` (`canActivate` e `canActivateChild` no `Shell`): sem usuário em memória, chama `GET /me` uma vez; 401 →
    `/login` com o caminho de retorno guardado em memória no `StaffSession` (nunca na URL); sessão com etapa pendente →
    a etapa (R5).
  - `permissionGuard`: cada rota declara `data: { ability: '<código>' }`; sem a permissão no conjunto do `/me`, a rota
    mostra a tela de acesso negado (componente da lib, sem carregar a tela pedida). Rotas sem `ability` exigem só sessão
    válida.
  - O menu do `Shell` lê as mesmas declarações de rota e mostra só os itens permitidos.
  - Caminho de retorno só é aceito se for caminho interno do backoffice (começa com `/`, não com `//`, e não é
    `/login` nem etapa do primeiro acesso); senão, painel.
- **Motivo:** Q1 = A (permissões efetivas da API, USERS-07); o front não copia a matriz de perfis × telas
  (princípio III). A API continua checando cada rota (D54), e o 403 dela é tratado pela base de erros.
- **Contrato:** a lista de permissões segue o USERS-07 da API: códigos estáveis `recurso.ação`, um por habilidade da
  matriz do ACL-01, inclusive as que dependem do registro (ex.: `reports.read`), que indicam só que a pessoa pode
  exercê-las em algum registro. O front as usa só para mostrar ou esconder menu, rotas e botões; a decisão final de cada
  registro continua no 403/404 da API.
- **Alternativas:** `data.roles` (copiaria a matriz; descartado por Q1); `canMatch` que esconde a rota (a pessoa veria
  "página não encontrada" em vez de "acesso negado", pior para entender).

## R5 · Fluxo de entrada e primeiro acesso

- **Decisão:** rotas fora do `Shell`, todas com `loadComponent`:
  `/login` (e-mail e senha), `/login/codigo` (desafio), `/primeiro-acesso/senha`, `/primeiro-acesso/autenticador` e
  `/primeiro-acesso/codigos`. Um serviço `SignInFlow`, com escopo do componente-pai de rota (`/login` e
  `/primeiro-acesso` como pais), guarda em memória a etapa atual informada pela API (`nextStep`: `MFA_REQUIRED`,
  `MFA_ENROLLMENT_REQUIRED`, `PASSWORD_CHANGE_REQUIRED`, `DONE`) e impede pular etapas pelo endereço (`replaceUrl` para
  a etapa certa, como o `NewReportFlow` da feature 002). `DONE` carrega o `/me` e vai para o caminho de retorno.
- **Ordem do primeiro acesso:** a API decide (`nextStep`); o front só navega. O esperado é troca de senha → cadastro do
  segundo fator → códigos de recuperação → `DONE`.
- **Recarregar no meio:** a sessão pendente antes do segundo fator não é restaurável pelo `/me` (exige MFA verificado),
  então volta para `/login` com a mensagem de sessão encerrada. Aceito (caso de borda da spec). A troca de senha
  exigida depois do segundo fator é restaurada: o `/me` responde com `passwordChangeRequired: true`, e os guards levam
  de volta à troca (decisão do backend, feature 006).
- **Senhas e códigos:** campos limpos depois de cada envio, com o `SensitiveInput` da lib (`autocomplete` adequado:
  `username`, `current-password`, `new-password`, `one-time-code`).

## R6 · QR code do cadastro sem violar CSP e Trusted Types

- **Decisão:** `<img [src]="qrCodeDataUri" alt="...">` com a imagem embutida que a API devolve, exigindo o formato
  `data:image/png;base64,...` (validado em tempo de execução nos tipos provisórios; outro formato é tratado como erro).
  O texto alternativo orienta a usar o segredo em texto, exibido logo abaixo, agrupado em blocos para leitura.
- **Motivo:** `img-src data:` já é permitido pela CSP (feature 001); `src` de `<img>` não é sink de Trusted Types; o
  sanitizador de URL do Angular aceita `data:image/png;base64`, mas **não** `data:image/svg+xml` — que exigiria
  `bypassSecurityTrust*`, proibido pela constituição (princípio II). Por isso o contrato pede PNG.
- **Alternativas:** gerar o QR code no front a partir da URI `otpauth://` (dependência nova e o segredo passaria por
  mais código); SVG embutido (precisaria de bypass).

## R7 · Códigos de recuperação exibidos uma vez

- **Decisão:** os 10 códigos vêm na resposta da confirmação do cadastro (AUTH-03) e ficam num `ScreenState` do
  componente de rota `/primeiro-acesso/codigos`; ao sair da rota, somem. "Copiar" usa a área de transferência com
  fallback de seleção manual; "Baixar arquivo" gera um `.txt` no navegador com nome fixo
  (`codigos-de-recuperacao.txt`). Recarregar a rota mostra que os códigos já foram exibidos e oferece continuar.
  "Continuar" só habilita depois da caixa "Guardei os códigos".
- **Reuso:** a geração do arquivo `.txt` no navegador hoje vive no portal (`features/new-report/receipt-file.ts`). A
  constituição manda código compartilhado para a lib (princípio V): a função passa para uma entrada secundária da lib
  (`@canal/shared/files`, para respeitar a regra do barril), e portal e backoffice a importam de lá, com os testes
  movidos junto. A tela do protocolo do portal não muda de comportamento.

## R8 · Simulador para as rotas de autenticação

- **Decisão:** `tools/mock-api` ganha `POST /api/admin/v1/auth/sign-in`, `/auth/mfa/challenge`,
  `/auth/mfa/enrollment`, `/auth/mfa/enrollment/confirmation`, `/auth/sign-out`, `GET /api/admin/v1/me` e
  `PUT /api/admin/v1/me/password`, com os formatos de `contracts/auth-api.md`, isolados por sessão de teste
  (`x-mock-session`, como nas features 002 e 003). Contas de cenário: `pronta` (com segundo fator), `primeiro-acesso`
  (senha provisória, sem segundo fator), `bloqueada`, `desativada`. Cenários: código inválido, bloqueio do desafio,
  senha comum recusada, perfil sem permissões, expiração forçada (401), relógio controlado para os horários.
- **Cookie de sessão do simulador:** `sid`, `HttpOnly`, `SameSite=Strict`, **sem** `Secure` e sem o prefixo
  `__Host-`. É o que o próprio pacote faz em desenvolvimento por HTTP fora de `localhost` (`secure: false` → nome `sid`,
  referência do `nestjs-auth`); os e2e rodam em `http://backoffice:8080` dentro do container. O front não lê o cookie
  em nenhum caso, então o nome não importa para o código.
- **Proteção por origem no simulador:** para métodos que alteram dados em `/api/admin`, recusa com 403 quando
  `Sec-Fetch-Site` não for `same-origin`/`none`, e, sem esse cabeçalho, quando `Origin` não bater com o host — o mesmo
  algoritmo de `evaluateCrossOriginRequest` do Nest (FR-026).
- **Sentinelas:** e-mails e nomes das contas de cenário levam `SIMULADA`; o QR code e o segredo de teste levam
  `__mock` no texto do segredo. O `check:build` já reprova essas sentinelas no build.

## R9 · Proteção contra escrita de outra origem (CSRF) e o proxy

- **Decisão:** a API usa `app.enableCsrfProtection()` (AUTH-07, ADR 0053), que segue o `CrossOriginProtection` do Go:
  métodos seguros passam; com `Sec-Fetch-Site`, só `same-origin` e `none` passam; sem ele, `Origin` precisa bater com o
  host. Não há token. O backoffice já chama a API na mesma origem (`/api` pelo nginx, D38). O proxy do backoffice
  precisa repassar `Origin`, `Sec-Fetch-Site` e o `Host` original (`proxy_set_header Host $host`), para que a
  comparação de origem funcione mesmo sem `Sec-Fetch-Site`. A configuração `withXsrfConfiguration` da feature 001 fica
  inerte (nenhum cookie `XSRF-TOKEN` é emitido) e não é removida nesta feature, para não mexer no portal sem
  necessidade; o `AGENTS.md` passa a dizer que a proteção é por origem.
- **Revisão (2026-11-28, decisão do usuário, D63 no ADR README da API):** depois da integração (T049 provou a proteção
  por origem contra a API real), a configuração XSRF foi removida. O `provideApi` usa `withNoXsrfProtection()`: só tirar
  o `withXsrfConfiguration` não bastaria, porque o `provideHttpClient` liga a proteção XSRF por padrão, com os mesmos
  nomes de cookie e cabeçalho. Na prática ela já não agia nas chamadas `api:` (o interceptor do Angular roda antes da
  troca do prefixo e vê outra origem), mas ficaria ativa para qualquer escrita relativa. Teste em `provide-api.spec.ts`.
- **Constituição, princípio II:** a redação 1.0.1 (emenda aprovada em 2026-11-28) pede proteção contra falsificação de
  requisição por token ou verificação de origem pela API; a proteção por origem da API, somada a `SameSite=Strict`,
  atende.
- **T058 da feature 001:** continua bloqueada pelo AUTH-07 e, quando liberada, prova a recusa de escrita de outra
  origem contra a API real, em vez de um cabeçalho de token.

## R10 · Tipos provisórios e integração bloqueada

- **Decisão:** `features/auth/auth.types.ts` com validação em tempo de execução das respostas (próxima etapa, horários,
  usuário atual, cadastro do segundo fator, códigos de recuperação), como `report-submission.types.ts` (002) e
  `tracking.types.ts` (003). A troca pelo cliente gerado `@canal/shared/api/admin` fica em tarefa bloqueada até AUTH-01
  a AUTH-07 e USERS-07 saírem no `openapi/admin.json`. Exceção registrada no Complexity Tracking e no `AGENTS.md`.

## R11 · Estados e mensagens de erro

- **Decisão:** cada tela declara em `API_CALLER_HANDLES` os status que trata:
  - login: `401` e `429` com a **mesma** mensagem genérica "E-mail ou senha inválidos" — a etapa da senha não tem
    mensagem própria de bloqueio, para não revelar se o e-mail existe (decisão do usuário, 2026-11-28);
  - desafio e confirmação do cadastro: `422 MFA_CODE_INVALID` (código errado) como erro no campo, com a sessão pendente
    mantida; no desafio, `423` (bloqueio temporário, mensagem sem motivo). `401` é só sessão ausente ou expirada e segue
    para a política de sessão encerrada (decisão do backend, feature 006);
  - troca de senha: `422` com código — `CURRENT_PASSWORD_INVALID` mostrado como erro no campo de senha atual, sem
    encerrar a sessão, e o código da regra para a senha nova (`PASSWORD_TOO_SHORT`, `PASSWORD_COMMON`,
    `PASSWORD_SAME_AS_CURRENT`); `401` aqui é só sessão ausente ou expirada (encerra).
    Depois de 5 senhas atuais erradas na mesma sessão, a API responde `429` e encerra a sessão: a tela trata o `429`
    chamando `StaffSession.end('unauthenticated')` (login com a mensagem de sessão encerrada).
  - `429` no desafio fica com a mensagem genérica da base de erros até o BAUTH-08
    (Produção), que mostra o tempo de espera.
- **Motivo:** mensagens próprias de cada tela sem anúncio duplo, como na feature 003.

## R12 · Impacto no bundle do backoffice

- **Hoje:** 347,02 kB de bundle inicial (aviso em 700 kB, erro em 1 MB).
- **Previsão:** `StaffSession`, guards, interceptor de atividade e a política entram no bundle inicial (são usados na
  configuração das rotas): até +8 kB. As telas de entrada e primeiro acesso são `loadComponent`: até 60 kB somados em
  chunks lazy, sem componente novo do Material além dos já usados (form field, input, checkbox, button, dialog).
  Previsão: até ~355 kB de bundle inicial. O portal muda só pela extração da função do arquivo `.txt` (R7), sem
  crescimento esperado.
- **Regra do barril:** nos componentes lazy, importar só de entradas secundárias da lib (`@canal/shared/http`,
  `@canal/shared/files`). O `check:build` reprova o barril no bundle inicial do portal; no backoffice o barril já está
  no bundle inicial (o `app.config.ts` importa dele), então a checagem lá é a medição do bundle registrada no plano.
