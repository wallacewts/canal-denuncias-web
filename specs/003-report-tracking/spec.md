# Feature Specification: Acompanhamento da denúncia pelo portal (consulta, andamento, mensagens e saída segura)

**Feature Branch**: `main` (sem branch de feature, decisão do usuário; diretório `specs/003-report-tracking`)

**Created**: 2026-11-28

**Status**: Draft

**Input**: User description: etapa 3 da ordem de implementação de `docs/tarefas/README.md` (portal, acompanhamento):
PACC-02 e PACC-03 (`docs/tarefas/02-portal-protocolo-e-consulta.md`) e PTRK-01, PTRK-02 e PTRK-04
(`docs/tarefas/03-portal-acompanhamento.md`). PACC-04 e PTRK-03 ficam fora, por serem do marco Produção e não estarem
na etapa 3. Os IDs de tarefa, os critérios de aceite, as regras de `docs/tarefas/README.md` e as decisões D05, D06,
D22, D23, D35, D38, D39 e D52 do registro de decisões (`canal-denuncias-api/docs/adr/README.md`) valem como requisitos
desta feature. Premissa herdada da feature 002: o aviso antes de a credencial do denunciante expirar entra no PTRK-02.
Decisão do usuário (mesma estratégia da feature 002): os endpoints de que esta feature depende (PUB-01, PUB-02,
PUB-03, MSG-01 e MSG-02) ainda não existem na API; a feature é construída e testada contra o servidor simulado,
estendido com os formatos do backlog da API, e a integração real fica bloqueada até eles saírem no contrato da API.

## Clarifications

### Session 2026-11-28

- Q: As mensagens novas são buscadas só pelo botão "Atualizar" ou também por busca periódica automática? → A: Opção
  A. Só pelo botão "Atualizar". O portal não faz nenhuma busca automática de mensagens.
- Q: As mensagens mostram só a data ou data e hora? → A: Opção A. Só a data, sem hora, para mensagens da equipe e do
  denunciante. O MSG-02 do backlog da API é ajustado pelo agente do backend para devolver e exibir só a data ao
  denunciante; a integração real (tarefa bloqueada) confere isso no contrato.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Denunciante volta com protocolo e chave e vê o andamento e o desfecho (Priority: P1)

Uma pessoa que já enviou uma denúncia volta ao portal, informa o protocolo e a chave que guardou e passa a ver o
andamento: o status em linguagem simples, a categoria, a data de recebimento, uma linha do tempo só com datas e, quando
a denúncia for concluída, o desfecho. Nada do que ela digita ou vê passa pela barra de endereço, pelo título da página,
pelo console ou pelo armazenamento do navegador, e o acesso some ao recarregar a página.

**Why this priority**: sem consultar, o protocolo e a chave entregues na feature 002 não têm uso. É também o ponto em
que a credencial do denunciante volta a circular, então precisa nascer com as garantias de anonimato.

**Independent Test**: com o servidor simulado, informar um protocolo e uma chave válidos e verificar a tela de
andamento em cada status (incluindo desfecho e "Aguardando sua resposta"); informar dados inválidos e verificar a
mensagem genérica; recarregar e verificar que o acesso foi encerrado. Tudo com as guardas de privacidade do e2e ativas
nos dois navegadores.

> Nota (2026-11-28): o e2e roda por enquanto só no Chromium; o Firefox está desativado temporariamente
> (`docs/validacoes/navegadores-e2e.md`).

**Acceptance Scenarios**:

1. **Given** a tela de consulta, **When** a pessoa informa protocolo e chave válidos e confirma, **Then** o acesso é
   aberto e ela vai para o acompanhamento, sem protocolo, chave ou credencial na URL.
2. **Given** a tela de consulta, **When** o protocolo é digitado em minúsculas, sem hífens ou com espaços, **Then** ele
   é normalizado para o formato `DV-XXXXX-XXXXX` antes do envio.
3. **Given** a tela de consulta, **When** o protocolo ou a chave estão errados, ou a denúncia foi encerrada ou
   expurgada, **Then** aparece sempre a mesma mensagem genérica "Protocolo ou chave inválidos", sem indicar qual campo
   errou.
4. **Given** o campo da chave, **When** a pessoa digita, **Then** os caracteres ficam ocultos, com um botão para
   mostrar e ocultar.
5. **Given** o acompanhamento aberto, **When** a denúncia está em cada status, **Then** o rótulo exibido é o do
   mapeamento público: Recebida; Em análise; Aguardando sua resposta; Encerrada; Concluída.
6. **Given** uma denúncia concluída, **When** o acompanhamento é exibido, **Then** aparece o desfecho: Procedente,
   Parcialmente procedente ou Improcedente (D22), sem justificativas internas.
7. **Given** uma denúncia "Aguardando sua resposta", **When** o acompanhamento é exibido, **Then** o prazo para
   responder aparece em destaque, com um atalho que leva direto ao campo de mensagem (D23).
8. **Given** o acompanhamento, **When** a linha do tempo é exibida, **Then** ela mostra só datas, sem hora, sem
   justificativas e sem nome de quem tratou. A categoria e a data de recebimento aparecem; o relato original não.
9. **Given** o acompanhamento aberto, **When** a pessoa recarrega a página ou abre `/acompanhamento` diretamente,
   **Then** ela volta para a tela de consulta, sem nenhum dado da denúncia.

---

### User Story 2 - Denunciante conversa com a equipe sem se identificar (Priority: P1)

Durante o acompanhamento, a pessoa lê as mensagens da equipe e responde. A equipe aparece sempre como "Equipe de
apuração". Ela pode buscar mensagens novas, é avisada antes de o acesso expirar para não perder um texto em
digitação, e numa denúncia encerrada continua lendo, mas não pode mais escrever.

**Why this priority**: o status "Aguardando sua resposta" (D23) só faz sentido se a pessoa conseguir responder. Sem as
mensagens, a apuração para quando a equipe precisa de um detalhe.

**Independent Test**: com o servidor simulado, abrir o acompanhamento, ler as mensagens, enviar uma resposta, buscar
mensagens novas, avançar o relógio até perto da expiração para ver o aviso, e abrir uma denúncia encerrada para
verificar que o envio não é oferecido.

**Acceptance Scenarios**:

1. **Given** mensagens da equipe e do denunciante, **When** a lista é exibida, **Then** elas aparecem em ordem
   cronológica, as da equipe com o autor "Equipe de apuração", nunca com nome de analista, numa lista acessível a
   leitor de tela.
2. **Given** o campo de resposta, **When** a pessoa digita, **Then** um contador mostra quantos caracteres restam até o
   limite de 5.000, e o envio fica desabilitado sem texto ou acima do limite.
3. **Given** uma resposta válida, **When** a pessoa envia, **Then** o botão fica desabilitado durante o envio, a
   mensagem aparece na lista e o campo é limpo; em caso de erro, o texto continua no campo.
4. **Given** o acompanhamento aberto, **When** a pessoa clica em "Atualizar", **Then** as mensagens novas entram na lista e são anunciadas a leitores de tela. Nenhuma busca acontece sem essa ação.
5. **Given** uma denúncia Encerrada ou Concluída, **When** o acompanhamento é exibido, **Then** as mensagens continuam
   visíveis, mas o campo de resposta não é oferecido e há uma explicação do porquê.
6. **Given** o acesso perto de expirar, **When** faltam 2 minutos para a credencial do denunciante expirar, **Then**
   aparece um aviso de que o acesso vai terminar e de que o texto não enviado será perdido.
7. **Given** uma resposta enviada quando a denúncia estava "Aguardando sua resposta", **When** o envio termina,
   **Then** o andamento é atualizado e o destaque do prazo deixa de aparecer.
8. **Given** a lista de mensagens, **When** cada mensagem é exibida, **Then** aparece só a data, sem hora, tanto nas mensagens da equipe quanto nas do denunciante.

---

### User Story 3 - Denunciante encerra o acesso sem deixar rastro (Priority: P2)

Em qualquer tela do acompanhamento a pessoa encontra o botão "Sair". Ao sair, ou quando o acesso expira, nenhuma
informação da denúncia continua na memória ou na tela, e o botão voltar do navegador não a mostra de novo. Há
orientações para quem usa um computador compartilhado.

**Why this priority**: protege quem acessa de um computador de outra pessoa. Vem depois das histórias P1 porque, sem
elas, não há o que encerrar; mas é obrigatória para o MVP.

**Independent Test**: abrir o acompanhamento, clicar em "Sair" e usar o botão voltar; deixar o acesso expirar; receber
um 401 simulado. Em todos os casos, verificar que a pessoa está na tela de consulta, com uma mensagem quando cabível, e
que nada da denúncia aparece.

**Acceptance Scenarios**:

1. **Given** qualquer tela do acompanhamento, **When** ela é exibida, **Then** o botão "Sair" está visível.
2. **Given** o acompanhamento, **When** a pessoa clica em "Sair", **Then** a credencial e todos os dados da denúncia
   são apagados da memória e ela vai para a tela de consulta.
3. **Given** que a pessoa saiu, **When** ela usa o botão voltar do navegador, **Then** o acompanhamento não é exibido
   de novo e ela continua na tela de consulta.
4. **Given** o acompanhamento, **When** a credencial expira (15 minutos) ou a API responde 401, **Then** os dados são
   apagados e a pessoa vai para a tela de consulta com a mensagem de que o acesso terminou e precisa ser aberto de novo.
5. **Given** a tela de consulta e o acompanhamento, **When** são exibidos, **Then** há orientações para computador
   compartilhado: fechar a aba ao terminar e não salvar a chave no navegador.

---

### Edge Cases

- A pessoa cola o protocolo com espaços antes ou depois, com hífens fora do lugar ou com letras minúsculas: o protocolo
  é normalizado; se ainda assim não tiver o formato, a mensagem continua sendo a genérica, sem dizer o que está errado.
- Clique duplo em "Consultar" ou em "Enviar mensagem": só uma requisição é feita.
- A API fica fora do ar durante a consulta ou o envio: aparece a mensagem de erro da base compartilhada; o protocolo e a
  chave digitados e o texto da mensagem não são perdidos.
- A credencial expira enquanto a pessoa digita uma mensagem: o aviso aparece 2 minutos antes; ao expirar, o texto é
  apagado junto com o resto (não há como guardá-lo sem violar o anonimato).
- A resposta do envio chega depois que a credencial expirou: o resultado é descartado e a pessoa vai para a consulta.
- A denúncia muda para encerrada entre a abertura da tela e o envio da mensagem: a API recusa (409) e a tela passa a
  mostrar as mensagens sem o campo de resposta, com a explicação.
- Lista de mensagens vazia: aparece um texto dizendo que ainda não há mensagens e, se a denúncia aceitar, como enviar a
  primeira.
- "Aguardando sua resposta" com o prazo já vencido: o prazo aparece como vencido, e o envio continua possível enquanto
  a API aceitar.
- A pessoa abre o portal em duas abas: cada aba tem o próprio acesso em memória; sair de uma não afeta a outra, e
  nenhuma compartilha dados por armazenamento do navegador.
- A pessoa tenta abrir `/acompanhamento` com dados na URL (por exemplo, colados de outro lugar): nada da URL é usado.

## Requirements _(mandatory)_

### Functional Requirements

**Consulta (PACC-02)**

- **FR-001**: A tela de consulta DEVE ter um formulário com protocolo e chave, com rótulos visíveis e o campo da chave
  oculto por padrão, com botão para mostrar e ocultar.
- **FR-002**: O portal DEVE normalizar o protocolo antes do envio: maiúsculas, sem espaços e com os hífens no formato
  `DV-XXXXX-XXXXX`.
- **FR-003**: Protocolo e chave DEVEM ir só no corpo da requisição de abertura de acesso, nunca na URL, no título, no
  console ou no armazenamento do navegador.
- **FR-004**: Qualquer falha na abertura do acesso (dados errados, denúncia encerrada ou expurgada) DEVE mostrar a
  mesma mensagem genérica "Protocolo ou chave inválidos", anunciada a leitores de tela, sem indicar qual campo errou.
- **FR-005**: Enquanto a consulta estiver em andamento, o botão DEVE ficar desabilitado e uma região de status DEVE
  informar que a consulta está em andamento.
- **FR-006**: Depois de uma falha, o protocolo e a chave digitados DEVEM continuar nos campos para correção; depois de
  um sucesso, os campos DEVEM ser limpos da memória da tela.

**Sessão do denunciante (PACC-03)**

- **FR-007**: Com sucesso na consulta, a credencial e o horário de expiração DEVEM ficar só em memória, na sessão do
  denunciante já existente na base compartilhada, e a pessoa DEVE ir para `/acompanhamento`.
- **FR-008**: A credencial DEVE ser enviada só às rotas de acompanhamento do denunciante, como já define a política de
  credenciais do portal (D39).
- **FR-009**: Sem credencial, `/acompanhamento` DEVE levar à tela de consulta. Recarregar a página DEVE encerrar o
  acesso.
- **FR-010**: Ao expirar a credencial ou ao receber 401, os dados da denúncia DEVEM ser apagados da memória e a pessoa
  DEVE ir para a tela de consulta com a mensagem de que o acesso terminou.

**Andamento e desfecho (PTRK-01)**

- **FR-011**: O status DEVE ser exibido com os rótulos públicos: Recebida; Em análise; Aguardando sua resposta;
  Encerrada; Concluída. O rótulo DEVE vir em texto, não só por cor.
- **FR-012**: Denúncia concluída DEVE mostrar o desfecho: Procedente, Parcialmente procedente ou Improcedente (D22).
- **FR-013**: Em "Aguardando sua resposta", o prazo para responder DEVE aparecer em destaque, com um atalho que leva o
  foco ao campo de mensagem (D23). Prazo vencido DEVE aparecer como vencido.
- **FR-014**: A linha do tempo DEVE mostrar só datas, sem hora, sem justificativas internas e sem nome de quem tratou.
- **FR-015**: A tela DEVE mostrar a categoria e a data de recebimento da denúncia. O relato original NÃO DEVE ser
  exibido.
- **FR-016**: Os rótulos de status e desfecho DEVEM ser derivados do que a API devolve, sem que o portal reproduza
  regras de transição de status (princípio III).

**Mensagens (PTRK-02)**

- **FR-017**: As mensagens DEVEM aparecer em ordem cronológica, numa lista acessível a leitor de tela. As da equipe
  DEVEM ter o autor "Equipe de apuração", nunca um nome.
- **FR-018**: Cada mensagem DEVE mostrar só a data, sem hora, para mensagens da equipe e do denunciante.
- **FR-019**: O campo de resposta DEVE aceitar de 1 a 5.000 caracteres, com contador do que resta, e o erro de tamanho
  DEVE ser anunciado e ligado ao campo.
- **FR-020**: Durante o envio, o botão DEVE ficar desabilitado e só uma requisição DEVE ser feita. Em caso de erro, o
  texto DEVE continuar no campo.
- **FR-021**: Depois do envio, a mensagem DEVE aparecer na lista, o campo DEVE ser limpo e o andamento DEVE ser
  atualizado (uma denúncia "Aguardando sua resposta" volta a "Em análise").
- **FR-022**: Mensagens novas DEVEM entrar na lista e ser anunciadas a leitores de tela. Elas DEVEM ser buscadas só quando a pessoa clica em "Atualizar"; o portal NÃO DEVE buscar mensagens automaticamente.
- **FR-023**: Denúncia Encerrada ou Concluída DEVE mostrar as mensagens, mas NÃO DEVE oferecer o campo de resposta. Uma
  recusa da API por denúncia encerrada (409) DEVE levar a tela a esse estado, com a explicação.
- **FR-024**: Dois minutos antes de a credencial expirar, o portal DEVE avisar que o acesso vai terminar e que o texto
  não enviado será perdido. O aviso DEVE ser anunciado a leitores de tela (premissa herdada da feature 002).

**Saída segura (PTRK-04)**

- **FR-025**: O botão "Sair" DEVE estar visível em todas as telas do acompanhamento.
- **FR-026**: Ao sair, a credencial e todos os dados da denúncia (andamento, mensagens, texto em digitação) DEVEM ser
  apagados da memória e a pessoa DEVE ir para a tela de consulta.
- **FR-027**: Depois de sair ou de expirar, o botão voltar do navegador NÃO DEVE exibir o acompanhamento de novo.
- **FR-028**: A tela de consulta e o acompanhamento DEVEM ter orientações para computador compartilhado: fechar a aba ao
  terminar e não salvar a chave no navegador.

**Simulador e integração**

- **FR-029**: Enquanto PUB-01, PUB-02, PUB-03, MSG-01 e MSG-02 não existirem no contrato da API, a feature DEVE ser
  testada contra o servidor simulado, estendido com os formatos do backlog da API, e o simulador NÃO DEVE chegar ao
  build de produção (verificado pelas sentinelas do `check:build`).
- **FR-030**: Quando esses endpoints existirem no contrato, o portal DEVE passar a usar o cliente gerado, sem tipos
  escritos à mão (tarefas bloqueadas até lá).

**Qualidade**

- **FR-031**: Os fluxos das três histórias DEVEM ter testes de ponta a ponta com as guardas de privacidade, nos dois
  navegadores.
- **FR-032**: As telas de consulta e de acompanhamento DEVEM passar no teste automatizado de acessibilidade, em 320 px
  de largura e com zoom de 200%.
- **FR-033**: Ao trocar da consulta para o acompanhamento, o foco DEVE ir para o título da página.

### Privacy & Security _(mandatory)_

- **Sensitive data on screen**: protocolo e chave (digitados na consulta), andamento, desfecho, categoria, data de
  recebimento e mensagens. São necessários para o denunciante acompanhar e responder. O relato original não é exibido
  (minimização, PUB-03).
- **Storage and URL**: protocolo, chave, credencial, andamento e mensagens ficam só em memória, com escopo de tela
  (D35). Nada vai para a URL (só os caminhos `/consultar` e `/acompanhamento`), para o título, para o console, para
  `localStorage`, `sessionStorage`, IndexedDB ou cookies do portal (D39: o portal não envia cookies). A credencial vai
  só às rotas `/public/v1/me/*`. Sair, expirar ou recarregar apaga tudo.
- **External requests**: nenhuma. A feature não acrescenta dependência nem asset externo, e o proxy do portal continua
  removendo IP e cookies (D38).
- **Permissions**: a abertura do acesso é pública (PUB-01). Andamento e mensagens exigem a credencial do denunciante
  (PUB-02); a API garante que a credencial só acessa a própria denúncia e recusa mensagens em denúncia encerrada. O
  portal só reflete esses estados.
- **Accessibility**: mensagem de erro genérica anunciada; contador e erro do campo ligados a ele; mensagens novas e o
  aviso de expiração anunciados; status e desfecho em texto; foco no título ao entrar no acompanhamento e no campo de
  mensagem pelo atalho do prazo; fluxo completo com teclado; 320 px e zoom de 200% (WCAG 2.1 AA).

### Key Entities _(include if feature involves data)_

- **Acesso do denunciante**: credencial e horário de expiração, só em memória. Começa na consulta e termina ao sair,
  expirar, receber 401 ou recarregar.
- **Andamento**: status público, desfecho (quando concluída), prazo de resposta (quando aguardando), categoria, data de
  recebimento e linha do tempo com datas.
- **Mensagem**: autor (denunciante ou "Equipe de apuração"), texto e data. Lida e enviada só durante o acesso.
- **Resposta em digitação**: texto ainda não enviado, de até 5.000 caracteres. Apagado ao enviar, sair ou expirar.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Uma pessoa com o protocolo e a chave em mãos chega ao andamento da denúncia em menos de 1 minuto, sem
  ajuda.
- **SC-002**: Em 100% dos testes de ponta a ponta, nenhum protocolo, chave, credencial, texto de mensagem ou dado do
  andamento aparece na URL, no título, no console ou no armazenamento do navegador, e nenhuma requisição sai para
  outra origem.
- **SC-003**: Em 100% das falhas de consulta, a mensagem exibida é a mesma, sem indicar qual dado estava errado.
- **SC-004**: Depois de sair, expirar ou recarregar, 0 dados da denúncia continuam acessíveis pela tela ou pelo botão
  voltar.
- **SC-005**: O aviso de expiração aparece em 100% dos casos ao menos 2 minutos antes do fim do acesso.
- **SC-006**: As telas de consulta e acompanhamento não têm nenhuma violação no teste automatizado de acessibilidade, em
  320 px e com zoom de 200%, nos dois navegadores.
  > Nota (2026-11-28): o e2e roda por enquanto só no Chromium; o Firefox está desativado temporariamente
  > (`docs/validacoes/navegadores-e2e.md`).
- **SC-007**: O fluxo inteiro (consultar, ler, responder e sair) pode ser feito só com o teclado.

## Assumptions

- **Endpoints simulados**: PUB-01 (abrir acesso), PUB-02 (guard do denunciante), PUB-03 (andamento), MSG-01 (enviar
  mensagem) e MSG-02 (ler mensagens) ainda não existem na API; só virão na etapa de domínio do backend. A feature usa o
  servidor simulado da feature 002, estendido com os formatos descritos em
  `canal-denuncias-api/docs/tarefas/08-public-tracking.md` e `10-messages.md`, e a integração real fica bloqueada
  (como as tarefas de integração da feature 002).
- **Credencial**: dura 15 minutos e não é renovada (PUB-01). Ao expirar, a pessoa abre o acesso de novo com protocolo e
  chave. Por isso o temporizador de inatividade de 30 minutos da feature 002 não é necessário aqui: o acesso termina
  antes.
- **Aviso de expiração**: 2 minutos antes, prazo escolhido como padrão razoável para terminar ou copiar uma frase.
- **Protocolo**: formato `DV-XXXXX-XXXXX` em base32 Crockford (REP-01). A normalização trata maiúsculas, espaços e
  hífens, como pede o PACC-02. Troca de caracteres ambíguos (por exemplo, `O` por `0`) não é feita, porque a API não a
  define.
- **Limite da mensagem**: de 1 a 5.000 caracteres (MSG-01). A API valida de novo; o limite no portal é só conveniência.
- **Reaproveitamento**: sessão do denunciante em memória, estado de tela, erro de formulário acessível, diálogo de
  confirmação, formatação de datas do portal, guardas de privacidade do e2e, sentinelas do simulador e a regra de que
  protocolo e chave nunca vão na URL, todos da base compartilhada (features 001 e 002).
- **Orçamento do bundle**: o código novo fica em chunks carregados sob demanda; o bundle inicial do portal continua
  dentro do aviso de 440 kB (D52).
- **MSG-02 ajustado**: por decisão do usuário, o MSG-02 do backlog da API passa a devolver ao denunciante só a data das
  mensagens. O simulador segue esse formato, e a integração real confere o contrato.
- **Fora do escopo**: encerrar o acesso no servidor (PACC-04, marco Produção), anexos em complementos (PTRK-03, marco
  Produção), notificações e qualquer tela do backoffice.
