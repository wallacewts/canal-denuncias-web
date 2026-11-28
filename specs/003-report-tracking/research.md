# Research: Acompanhamento da denúncia pelo portal

Feature: `specs/003-report-tracking` · Data: 2026-11-28

Cada decisão tem o formato Decisão / Motivo / Alternativas. Não restou nenhum ponto "NEEDS CLARIFICATION".

## R1. Simulador estendido para PUB-01 a PUB-03, MSG-01 e MSG-02

- **Decisão**: estender `tools/mock-api/server.mjs` (o mesmo simulador da feature 002) com as rotas
  `POST /api/public/v1/tracking/sessions`, `GET /api/public/v1/me/report`, `GET /api/public/v1/me/messages` e
  `POST /api/public/v1/me/messages`, nos formatos de `contracts/mock-api-tracking.md`. O simulador continua isolado por
  sessão (`x-mock-session`), com cenários por rota (`POST /__mock/scenario`) e contadores (`GET /__mock/stats`).
  - Tokens, protocolos e textos do simulador usam as sentinelas já existentes (`DV-SIMUL`, `SIMULADA`, `__mock`); o
    token simulado começa com `SIMULADA.`. O `check:build` já reprova essas sentinelas no build de produção, e o lint
    já impede os apps de importar `tools/` e `e2e/`.
  - O simulador valida o corpo (campos permitidos, limite de 5.000 caracteres da mensagem) e responde 400 sem repetir
    o valor, como o da feature 002.
  - O guard do denunciante é simulado: `/me/*` sem `Authorization: Bearer SIMULADA.…`, com token de outra sessão ou
    expirado responde 401 no formato `ApiError`.
  - O simulador nunca registra o corpo, o protocolo, a chave nem o token em log.
- **Motivo**: reaproveita o mecanismo aprovado na 002 (D37, R1 da 002), sem dependência nova e sem código simulado nos
  apps. Os e2e continuam rodando contra o build de produção, com nginx e CSP reais.
- **Alternativas**: interceptor de respostas simuladas no próprio app (rejeitada: o código iria para o bundle e
  exigiria remoção em build); servidor simulado separado só para esta feature (rejeitada: duplicaria sessões,
  sentinelas e proxy).

## R2. Tipos provisórios até o contrato existir

- **Decisão**: um arquivo `features/tracking/tracking.types.ts` com os tipos provisórios das quatro respostas e a
  validação em tempo de execução de cada uma (a resposta que não bater com o formato vira erro tratado), no mesmo
  padrão de `report-submission.types.ts` da 002. Uma tarefa bloqueada (⛔ PUB-01, PUB-03, MSG-01, MSG-02) troca esses
  tipos pelo cliente gerado de `openapi/public.json` e remove o arquivo e a exceção do Complexity Tracking.
- **Motivo**: o princípio V proíbe tipos de resposta da API escritos à mão; a exceção temporária, com validação em
  tempo de execução e remoção prevista, é a mesma já aceita nas features 001 (`ProvisionalApiError`) e 002.
- **Alternativas**: esperar os endpoints (rejeitada pelo usuário, que escolheu a mesma estratégia da 002).

## R3. Ciclo de vida do acesso do denunciante

- **Decisão**: um serviço do portal, `ReporterAccess` (raiz, em `features/tracking/reporter-access.ts`), que envolve a
  `ReporterSession` da lib e concentra o ciclo de vida:
  - **Abrir**: recebe `{ token, expiresAt }` da consulta e chama `ReporterSession.start`.
  - **Aviso**: um temporizador dispara em `expiresAt − 2 min` e liga o signal `expiringSoon`. Se a pessoa entrar
    com menos de 2 minutos, o aviso aparece na hora.
  - **Expirar**: outro temporizador dispara em `expiresAt`; limpa a sessão e todos os dados (R4), navega para
    `/consultar` com `replaceUrl` e registra o motivo `expired`.
  - **401**: a `onUnauthenticated` da política do portal passa a chamar o mesmo encerramento, com o motivo `expired`
    (hoje ela limpa e navega sem mensagem). Um encerramento já em curso não é repetido.
  - **Sair**: mesmo encerramento, com o motivo `logout`.
  - **Mensagem (analyze I3)**: um só mecanismo. O `ReporterAccess` expõe o signal `endReason` (`expired`,
    `logout` ou `null`), e a tela de consulta mostra o texto numa região `role="status"`: "Seu acesso terminou. Informe
    o protocolo e a chave de novo." ou "Você saiu do acompanhamento.". O motivo é lido uma vez e zerado. Não há
    snackbar para isso.
  - **Respostas atrasadas (analyze C1)**: cada acesso tem um número de geração; uma resposta que chega depois do
    encerramento (geração diferente) é descartada sem atualizar a tela.
  - Os temporizadores são cancelados em qualquer encerramento; a credencial não é renovada (PUB-01).
- **Motivo**: um único ponto de encerramento garante que sair, expirar e receber 401 apaguem exatamente as mesmas
  coisas. A `ReporterSession` da lib continua mínima (token e expiração), sem regra de tela.
- **Alternativas**: temporizadores dentro da tela de acompanhamento (rejeitada: a credencial existe também durante a
  navegação entre consulta e acompanhamento, e o encerramento por 401 vem da política HTTP); estender a
  `ReporterSession` da lib (rejeitada: o backoffice não usa e a lib ficaria com regra do portal).

## R4. Onde fica o estado da tela (D35)

- **Decisão**:
  - A tela `/acompanhamento` fornece um `ScreenState<TrackingView>` no próprio componente de rota, com o andamento, as
    mensagens e a resposta em digitação (um `FormControl<string>`). O estado morre com o componente.
  - A tela `/consultar` fornece outro `ScreenState` com o formulário de protocolo e chave; ele é limpo logo depois do
    sucesso, antes da navegação.
  - O `ReporterAccess` guarda só a credencial (pela `ReporterSession`) e os signals de ciclo de vida, nunca o
    andamento ou as mensagens.
  - Ao encerrar o acesso, o `ReporterAccess` limpa a sessão e navega; a tela de acompanhamento, ao ser destruída, zera
    o `ScreenState` (já é o comportamento do `ScreenState` da feature 001).
- **Motivo**: segue a D35 (estado sensível com escopo de tela) e garante que nada da denúncia sobreviva à saída da
  tela.
- **Alternativas**: um store raiz com o andamento (rejeitada: manteria dados depois de sair da tela).

## R5. Voltar do navegador e cache de páginas

- **Decisão**:
  - Guard `canActivate` em `/acompanhamento`: sem credencial, `createUrlTree(['/consultar'])`, o que também troca a
    entrada do histórico.
  - Toda navegação de encerramento usa `replaceUrl: true`, para que o histórico não tenha uma entrada de
    `/acompanhamento` válida.
  - Um ouvinte de `pageshow` no portal: quando `event.persisted` é verdadeiro (página restaurada do cache de
    navegação do navegador depois de a pessoa sair do site), o portal encerra o acesso e recarrega a rota atual. O
    `index.html` já sai com `Cache-Control: no-store` (feature 001), o que na maioria dos navegadores já impede esse
    cache; o ouvinte cobre os que restauram mesmo assim.
- **Motivo**: o voltar dentro do próprio app passa pelo router e cai no guard; o voltar depois de sair para outro site
  pode restaurar a página com a memória inteira, e só o `pageshow` detecta isso.
- **Alternativas**: depender só do `no-store` (rejeitada: navegadores recentes podem guardar mesmo assim).

## R6. Aviso de expiração não modal

- **Decisão**: o aviso dos 2 minutos é uma faixa dentro da tela de acompanhamento, com `role="alert"`, que não move o
  foco nem bloqueia a digitação. O texto diz quanto tempo resta (em minutos) e que o texto não enviado será perdido.
  Não há botão de renovar, porque a API não renova a credencial.
- **Motivo**: um diálogo modal no meio da digitação tiraria o foco do campo e poderia fazer a pessoa perder a frase. A
  faixa é anunciada uma vez pelo leitor de tela e permanece visível.
- **Alternativas**: `ConfirmDialog` (rejeitada pelo motivo acima e porque não há ação a confirmar).

## R7. Consulta: normalização e campo da chave

- **Decisão**:
  - Função pura `normalizeProtocol(raw)`: remove espaços, passa para maiúsculas, remove hífens e, se sobrarem
    `DV` + 10 caracteres, devolve `DV-XXXXX-XXXXX`; caso contrário devolve o texto limpo (a API decide e a mensagem é a
    genérica). O alfabeto Crockford não é validado no portal (princípio III: a regra é da API).
  - O campo da chave é `type="password"`, com botão "Mostrar chave"/"Ocultar chave" (`aria-pressed`). O formulário não
    navega (submit tratado no componente) e o campo usa `autocomplete="off"`. Isso reduz, mas não elimina, a oferta
    de salvar senha em alguns navegadores; por isso a orientação "não salve a chave no navegador" fica visível ao lado
    do campo (FR-028).
  - Qualquer erro da abertura de acesso (401, 400, 429) mostra a mesma mensagem genérica no formulário, anunciada
    (`role="alert"`); erros de rede e 5xx usam a mensagem padrão da base compartilhada.
- **Motivo**: cumpre o PACC-02 e mantém a mensagem igual para qualquer falha (SC-003).
- **Alternativas**: campo de texto comum com máscara CSS (rejeitada: propriedade não padronizada e sem suporte
  confiável nos dois navegadores).

## R8. Mensagens: busca e envio

- **Decisão**:
  - As mensagens são carregadas junto com o andamento, ao abrir a tela, e de novo só pelo botão "Atualizar" (Q1 = A).
    As novas entram na lista e são anunciadas por uma região `aria-live="polite"` ("2 mensagens novas").
  - Depois de enviar, a tela recarrega andamento e mensagens (o status pode ter voltado a "Em análise", MSG-01).
  - O envio usa o padrão de proteção contra clique duplo da 002 (sinal `submitting`, botão desabilitado, região de
    status separada).
  - Um 409 no envio (denúncia encerrada) recarrega o andamento; a tela passa a mostrar as mensagens sem o campo de
    resposta, com a explicação.
  - Datas só com o dia, sem hora (Q2 = A), pelo `PortalDatePipe` já existente.
- **Motivo**: cumpre as respostas Q1 e Q2 sem requisições que a pessoa não pediu.
- **Alternativas**: busca periódica (rejeitada pelo usuário em Q1).

## R9. Quem decide se a pessoa pode responder

- **Decisão**: o contrato provisório do andamento inclui o campo `canReply` (booleano), e a tela mostra o campo de
  resposta só quando ele é verdadeiro. A proposta de incluir `canReply` na resposta de PUB-03 é registrada como
  premissa e levada ao backend, assim como foi feito com os códigos de `dataTypes` na 002. Até lá o simulador devolve
  `canReply = false` para os status públicos Encerrada e Concluída.
- **Motivo**: o princípio III diz que o portal consome as regras da API em vez de copiá-las; a regra "denúncia
  encerrada não aceita mensagem" é do MSG-01.
- **Alternativas**: derivar do status no portal (rejeitada: copiaria a regra da API e poderia divergir).

## R10. Rótulos de status e desfecho

- **Decisão**: o contrato provisório devolve o status público em código (`RECEIVED`, `IN_REVIEW`,
  `AWAITING_REPORTER`, `CLOSED`, `CONCLUDED`) e o desfecho em código (`SUBSTANTIATED`, `PARTIALLY_SUBSTANTIATED`,
  `UNSUBSTANTIATED`). O portal tem só a tabela de textos (código → rótulo em português), sem nenhuma regra de
  transição. Código desconhecido mostra "Em análise" e não quebra a tela.
- **Motivo**: o mapeamento de status interno para público é da API (PUB-03); traduzir o código público para texto é
  apresentação.
- **Alternativas**: a API devolver o texto pronto (rejeitada: textos de interface ficam no front, que é onde o i18n
  futuro vai atuar).

## R11. Impacto no bundle

- **Decisão**: o código novo fica nas rotas `/consultar` e `/acompanhamento`, que já são carregadas sob demanda
  (`loadComponent`). O `ReporterAccess` é raiz, mas pequeno, e é importado pela política do portal (já no bundle
  inicial). Meta: bundle inicial do portal até +3 kB (de 413,4 kB para até ~417 kB; aviso em 440 kB pela D52) e chunks
  da feature até 60 kB somados, sem compressão. Nenhum componente novo do Material além dos já usados
  (form-field, input, button), o que evita puxar runtime novo para o bundle inicial. A medição entra no relatório de
  cada fase.
- **Motivo**: a D52 deixou 26,6 kB de folga no aviso; esta feature não deve consumir uma parte relevante dela.
- **Alternativas**: nenhuma necessária.
