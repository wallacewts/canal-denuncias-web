# Feature Specification: Base transversal do front (lib compartilhada)

**Feature Branch**: `main` (sem branch de feature, decisão do usuário; diretório `specs/001-shared-foundation`)

**Created**: 2026-11-27

**Status**: Draft

**Input**: User description: conteúdo de `docs/tarefas/00-transversal.md` (tarefas FTRV-01 a FTRV-11). Os IDs de
tarefa, os critérios de aceite, as dependências do backend (TRV-01, TRV-07, TRV-08, TRV-11, AUTH-07, PUB-02) e as
regras e decisões de `docs/tarefas/README.md` valem como requisitos desta feature.

## Clarifications

### Session 2026-11-27

- Q: Os testes de ponta a ponta com os fluxos do MVP e a validação de CSP e acessibilidade em todas as telas
  (FTRV-05, 06, 07, 11) entram inteiros nesta feature, se as telas ainda não existem? → A: Opção A. Esta feature
  entrega a estrutura de testes de ponta a ponta com as guardas de privacidade, de CSP e de acessibilidade, aplicadas a
  todas as rotas que já existem, além das regras de verificação de código e dos limites de tamanho. Cada feature de tela
  seguinte acrescenta o teste do seu fluxo. Os critérios "fluxos do MVP cobertos" e "todas as rotas sem violação" fecham
  na etapa 7 do backlog ("Qualidade do MVP").
- Q: De onde vem o contrato da API? → A: A API grava dois contratos versionados, um com as rotas públicas
  (`/api/public/v1`) e outro com as rotas administrativas (`/api/admin/v1`), por um script próprio (TRV-11). O
  front copia os dois arquivos, do repositório da API ou do artefato do CI dela.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Denunciante usa o portal sem deixar rastros (Priority: P1)

Uma pessoa abre o portal público para denunciar ou acompanhar uma denúncia. Durante todo o uso, o portal não
conversa com nenhum serviço de terceiros, não envia cookies, não guarda nada no navegador e não coloca protocolo,
chave ou texto do relato na barra de endereço, no título da página ou no console. Ao acompanhar a denúncia, a
credencial de acompanhamento existe só enquanto a página está aberta.

**Why this priority**: o anonimato é o princípio inegociável do sistema (constituição, princípio I). Qualquer rastro
técnico deixado no navegador ou enviado a terceiros pode identificar quem denunciou, inclusive num computador
compartilhado. Sem isso, nenhuma outra tela do portal pode ir para produção.

**Independent Test**: percorrer todas as rotas do portal num navegador sem extensões, observando o tráfego de rede, o
armazenamento do navegador, a barra de endereço e o console. Entrega valor sozinho porque garante as regras de
privacidade que todas as telas futuras herdam.

**Acceptance Scenarios**:

1. **Given** o portal aberto num navegador sem extensões, **When** a pessoa navega por todas as rotas, **Then** nenhuma
   requisição sai para domínio diferente do próprio portal e da API (FTRV-06, FTRV-11).
2. **Given** a pessoa concluiu um fluxo completo no portal, **When** se inspeciona o armazenamento do navegador,
   **Then** armazenamento local, armazenamento de sessão e banco local do navegador estão vazios (FTRV-11).
3. **Given** qualquer chamada do portal à API, **When** ela é enviada, **Then** não leva cookies; nas rotas de
   acompanhamento (`/public/v1/me/*`) leva só a credencial do denunciante guardada em memória (FTRV-03, PUB-02).
4. **Given** os dois apps rodando com a política de segurança de conteúdo ativa, **When** se navega por todas as rotas
   em dois navegadores diferentes, incluindo diálogos, avisos, menus, dicas, seletores de data e listas suspensas,
   **Then** o console não mostra nenhuma violação da política (FTRV-05).
5. **Given** os campos de relato e de chave, **When** a pessoa digita, **Then** o navegador não oferece preenchimento
   automático nem correção ortográfica nos campos em que o texto não é livre (FTRV-11).

---

### User Story 2 - Mensagens de erro claras e sessão expirada tratada (Priority: P1)

Quando algo dá errado numa chamada à API, a pessoa (denunciante ou equipe) vê uma mensagem em português que explica o
que aconteceu e o que fazer, com um código para informar ao suporte. Se a sessão expirou, ela é levada para o lugar
certo: a equipe para o login, o denunciante para a tela de consulta.

**Why this priority**: todas as telas dos dois apps dependem desse comportamento. Sem ele, cada tela trataria erros de
um jeito, e detalhes técnicos ou dados sensíveis poderiam aparecer na tela ou no console.

**Independent Test**: simular respostas de erro da API para cada código de status e verificar a mensagem exibida, o
anúncio para leitores de tela, o redirecionamento e a ausência de dados no console.

**Acceptance Scenarios**:

1. **Given** uma resposta de erro no formato padrão da API (código, tipo, mensagem e identificador da requisição),
   **When** ela chega a qualquer tela, **Then** a pessoa vê uma mensagem em português com o identificador para suporte,
   anunciada por leitores de tela (FTRV-02, TRV-01).
2. **Given** um membro da equipe com sessão expirada, **When** uma chamada volta como "não autenticado", **Then** ele é
   levado ao login do backoffice.
3. **Given** um denunciante cuja credencial de acompanhamento expirou, **When** uma chamada volta como "não
   autenticado", **Then** ele é levado à tela de consulta do portal, sem que protocolo ou chave apareçam na URL.
4. **Given** respostas "sem permissão", "não encontrado", "conflito", "não está mais disponível" e "muitas
   tentativas", **When** chegam, **Then** cada uma tem mensagem própria; qualquer erro inesperado do servidor mostra
   uma mensagem genérica.
5. **Given** qualquer erro, **When** ele é tratado, **Then** nenhum corpo de requisição ou de resposta é escrito no
   console.

---

### User Story 3 - Interface acessível e consistente (Priority: P2)

As pessoas encontram nos dois apps a mesma identidade visual e os mesmos componentes de apoio: cabeçalho de página,
estado vazio, carregamento, confirmação, indicador de status e datas em português. O portal pode ser usado só com
teclado, com leitores de tela, com zoom de 200% e em telas estreitas.

**Why this priority**: o portal precisa atender WCAG 2.1 AA (constituição, princípio IV) para que qualquer pessoa
consiga denunciar. Os componentes base evitam que cada tela resolva acessibilidade e consistência de forma diferente.

**Independent Test**: rodar a verificação automática de acessibilidade em todas as rotas do portal, navegar só com
teclado e conferir os componentes base isoladamente.

**Acceptance Scenarios**:

1. **Given** qualquer rota do portal, **When** a verificação automática de acessibilidade roda, **Then** não há
   violação séria ou crítica (FTRV-07).
2. **Given** um título de página da lib compartilhada, **When** a tela pede o foco nele (como o wizard fará ao trocar
   de etapa, na feature de nova denúncia), **Then** o foco vai para o título.
3. **Given** um erro de preenchimento, **When** ele aparece, **Then** é anunciado e fica ligado ao campo
   correspondente.
4. **Given** uma ação que precisa de confirmação, **When** a pessoa a aciona, **Then** aparece o diálogo de
   confirmação do próprio app, nunca a caixa nativa do navegador (FTRV-09).
5. **Given** uma data exibida, **When** está no portal, **Then** aparece só com o dia; **When** está no backoffice,
   **Then** aparece com data e hora exatas (decisão D25).
6. **Given** um indicador de status, **When** é exibido, **Then** transmite o significado por texto além da cor.

---

### User Story 4 - Ambiente local igual ao de produção para a equipe (Priority: P2)

No ambiente local com containers, os dois apps falam com a API pelo mesmo endereço, como em produção. Assim, as ações
da equipe que alteram dados carregam a proteção contra falsificação de requisição, e o comportamento testado
localmente é o mesmo que vai para produção.

**Why this priority**: é uma pendência do esqueleto. Hoje, no ambiente local, a proteção contra falsificação não é
enviada, então nenhum fluxo administrativo pode ser testado de ponta a ponta.

**Independent Test**: subir o ambiente local, fazer uma ação administrativa que altera dados e confirmar que a
requisição leva o token de proteção e é aceita pela API.

**Acceptance Scenarios**:

1. **Given** o ambiente local com containers, **When** um app chama a API, **Then** a chamada vai para o caminho
   `/api` do próprio endereço do app, repassado para a API (FTRV-04, AUTH-07).
2. **Given** uma ação administrativa que altera dados, **When** é enviada no ambiente local, **Then** leva o token de
   proteção contra falsificação.
3. **Given** a política de segurança de conteúdo, **When** o ambiente local usa o mesmo endereço, **Then** as conexões
   permitidas voltam a ser só o próprio endereço.

---

### User Story 5 - Contrato com a API sempre sincronizado e regressões barradas (Priority: P2)

Quem mantém o front trabalha com tipos e chamadas gerados a partir do contrato publicado pela API, nunca escritos à
mão, e tem testes de ponta a ponta que cobrem os fluxos do MVP e falham diante de qualquer regressão de privacidade.
O estado das telas segue um padrão único, e nada sensível sobrevive à saída da tela.

**Why this priority**: sem contrato gerado, front e API divergem em silêncio. Sem testes de ponta a ponta, uma
regressão de privacidade (requisição externa, dado na URL) não gera nenhum erro visível (constituição, princípio VI).

**Independent Test**: alterar o contrato versionado sem regerar o código e confirmar que a verificação de integração
contínua falha; rodar os testes de ponta a ponta contra o ambiente local.

**Acceptance Scenarios**:

1. **Given** o contrato da API versionado no repositório, **When** o código gerado está desatualizado em relação a
   ele, **Then** a verificação de integração contínua falha (FTRV-01, TRV-11).
2. **Given** a geração do código a partir do contrato, **When** ela roda, **Then** não faz nenhuma requisição externa.
3. **Given** a estrutura de testes de ponta a ponta, **When** roda, **Then** percorre todas as rotas que já existem nos
   dois apps com as guardas de privacidade, de CSP e de acessibilidade. Os fluxos do MVP (enviar denúncia, consultar,
   trocar mensagem, login com segundo fator, triagem, atribuição e conclusão) são acrescentados por cada feature de
   tela e fecham na etapa 7 do backlog (opção A, FTRV-06).
4. **Given** qualquer teste de ponta a ponta, **When** uma requisição vai para domínio diferente do app ou da API, ou a
   URL contém protocolo, chave ou texto do relato, ou o console mostra violação da política de segurança de conteúdo,
   **Then** o teste falha.
5. **Given** dados sensíveis em tela (rascunho do relato, denúncia aberta, identidade revelada), **When** a pessoa sai
   da tela ou a sessão termina, **Then** esses dados são descartados (FTRV-10).

---

### Edge Cases

- **API fora do ar ou sem rede**: a pessoa vê uma mensagem dizendo que não foi possível falar com o servidor e
  sugerindo tentar de novo, sem expor detalhes técnicos.
- **Configuração do app ausente ou inválida** (endereço da API): o app não inicia em estado quebrado; mostra uma
  mensagem de indisponibilidade.
- **Erro fora do formato padrão** (sem corpo ou sem identificador da requisição): mensagem genérica, sem o
  identificador, e nada é escrito no console.
- **Credencial do denunciante expira enquanto ele escreve uma mensagem**: ele é levado à consulta, e o texto não é
  guardado no navegador; a tela avisa que o texto não enviado será perdido antes de redirecionar, quando possível.
- **Recarregar a página ou abrir outra aba no acompanhamento**: a credencial em memória se perde por design, e a
  pessoa precisa consultar de novo com protocolo e chave.
- **Extensão do navegador tenta carregar recurso externo**: a política de segurança bloqueia; o app continua
  funcionando, e a verificação de navegador real é feita sem extensões.
- **Componente visual que injeta estilo é bloqueado pela política de segurança**: a correção é registrada como decisão
  antes de qualquer afrouxamento da política.
- **Muitas tentativas**: a mensagem informa que é preciso aguardar antes de tentar de novo.

## Requirements _(mandatory)_

### Functional Requirements

**Contrato com a API (FTRV-01)**

- **FR-001**: Os tipos e as chamadas à API DEVEM ser gerados a partir do contrato publicado pela API (TRV-11),
  versionado no repositório; nenhum formato de dado da API pode ser escrito à mão nos apps.
- **FR-002**: A geração DEVE funcionar sem nenhuma requisição externa.
- **FR-003**: A integração contínua DEVE falhar quando o código gerado estiver desatualizado em relação ao contrato.
- **FR-004**: A ferramenta de geração escolhida DEVE ser registrada como decisão.

**Tratamento de erros (FTRV-02)**

- **FR-005**: Os dois apps DEVEM interpretar o formato padrão de erro da API (TRV-01) e mostrar uma mensagem em
  português com o identificador da requisição, anunciada por leitores de tela.
- **FR-006**: "Não autenticado" DEVE levar a equipe ao login do backoffice e o denunciante à tela de consulta do
  portal.
- **FR-007**: "Sem permissão", "não encontrado", "conflito", "não está mais disponível" e "muitas tentativas" DEVEM ter
  mensagens próprias; erro inesperado do servidor DEVE mostrar mensagem genérica.
- **FR-008**: Nenhum corpo de requisição ou de resposta, nem o objeto de erro completo, DEVE ser escrito no console.
- **FR-009**: Cada código de status tratado DEVE ter teste automatizado.

**Credenciais por app (FTRV-03)**

- **FR-010**: O backoffice DEVE enviar as credenciais de sessão da equipe nas chamadas à API; o portal NÃO DEVE enviar
  cookies.
- **FR-011**: No portal, a credencial do denunciante, guardada só em memória, DEVE ser enviada apenas nas rotas de
  acompanhamento (`/public/v1/me/*`, PUB-02).
- **FR-012**: Os dois comportamentos DEVEM ter testes automatizados.

**Mesmo endereço no ambiente local (FTRV-04)**

- **FR-013**: No ambiente local com containers, cada app DEVE repassar o caminho `/api` para a API, como o proxy de
  produção, com o endereço da API configurável.
- **FR-014**: A configuração dos apps DEVE apontar para `/api`, e a política de segurança de conteúdo DEVE permitir
  conexões só com o próprio endereço.
- **FR-015**: Ações administrativas que alteram dados DEVEM levar o token de proteção contra falsificação (AUTH-07),
  conferido em teste de ponta a ponta.
- **FR-016**: A documentação do repositório DEVE explicar o novo funcionamento do ambiente local.

**Política de segurança no navegador real (FTRV-05)**

- **FR-017**: Todas as rotas dos dois apps DEVEM ser navegadas em dois navegadores diferentes, sem extensões, sem
  nenhuma violação da política de segurança de conteúdo no console, incluindo os componentes que injetam estilo ou
  estrutura na página.
- **FR-018**: Qualquer bloqueio encontrado DEVE ser resolvido sem afrouxar a política; se não houver alternativa, a
  mudança DEVE ser registrada como decisão antes de ser feita.

**Testes de ponta a ponta (FTRV-06)**

- **FR-019**: DEVE existir uma estrutura de testes de ponta a ponta, rodando de forma isolada da máquina local e na
  integração contínua, aplicada a todas as rotas que já existem nos dois apps. Os testes dos fluxos do MVP são
  acrescentados pelas features de tela e fecham na etapa 7 do backlog (opção A).
- **FR-020**: Todo teste de ponta a ponta DEVE falhar se uma requisição for para domínio diferente do app ou da API,
  se a URL contiver protocolo, chave ou texto do relato, ou se o console mostrar violação da política de segurança.

**Acessibilidade (FTRV-07)**

- **FR-021**: Todas as rotas do portal DEVEM passar pela verificação automática de acessibilidade sem violação séria
  ou crítica.
- **FR-022**: O portal DEVE funcionar só com teclado, com foco visível. O título de página da lib compartilhada DEVE
  permitir mover o foco para ele; o uso no wizard (foco no título ao trocar de etapa) entra na feature de nova
  denúncia (opção A).
- **FR-023**: Erros de formulário DEVEM ser anunciados e ligados ao campo correspondente.
- **FR-024**: Os textos DEVEM ter contraste mínimo de 4,5:1, e os dois apps DEVEM declarar o idioma português do
  Brasil.
- **FR-025**: Os dois apps DEVEM funcionar com zoom de 200% e na largura de 320 px.

**Tema e componentes base (FTRV-09)**

- **FR-026**: A lib compartilhada DEVE oferecer tema próprio e os componentes cabeçalho de página, estado vazio,
  carregamento, diálogo de confirmação e indicador de status, além de formatação de datas em português.
- **FR-027**: Confirmações DEVEM usar o diálogo do app, nunca a caixa nativa do navegador.
- **FR-028**: Datas DEVEM aparecer só com o dia no portal e com data e hora exatas no backoffice (D25).
- **FR-029**: O indicador de status DEVE transmitir o significado por texto, não só por cor.
- **FR-030**: Os componentes base DEVEM ter testes automatizados e não podem usar estilos que a política de segurança
  bloqueie.

**Estado e formulários (FTRV-10)**

- **FR-031**: O padrão de gerenciamento de estado das telas DEVE ser escolhido e registrado como decisão.
- **FR-032**: Formulários DEVEM ser tipados, e nenhum estado DEVE ser persistido no navegador.
- **FR-033**: Estado sensível (rascunho do relato, denúncia aberta, identidade revelada) DEVE ser descartado ao sair
  da tela ou ao encerrar a sessão.

**Proteção de dados no cliente (FTRV-11)**

- **FR-034**: Uma regra de verificação de código DEVE impedir escrita no console no código dos apps, somando-se às
  regras que já proíbem armazenamento local, de sessão e cookies legíveis.
- **FR-035**: A versão de produção NÃO DEVE publicar mapas de código-fonte.
- **FR-036**: Um teste de ponta a ponta DEVE confirmar que o armazenamento do navegador continua vazio depois do fluxo
  completo.
- **FR-037**: Campos de relato e de chave DEVEM desativar preenchimento automático e, onde o texto não é livre,
  correção ortográfica do navegador.

### Privacy & Security _(mandatory)_

- **Sensitive data on screen**: esta feature não cria telas de negócio, mas define como as futuras telas tratam o
  relato, o protocolo, a chave, a credencial de acompanhamento do denunciante e a identidade revelada. Os componentes
  base e o tratamento de erros nunca exibem esses dados em mensagens de erro; o identificador da requisição é o único
  dado técnico mostrado, porque é necessário para o suporte e não identifica ninguém.
- **Storage and URL**: nada vai para URL, armazenamento local, armazenamento de sessão, banco local do navegador,
  cookies do portal, título da página ou console. A credencial do denunciante fica só em memória (FR-011). Isso é
  verificado por regra de código (FR-034) e por teste de ponta a ponta (FR-020, FR-036).
- **External requests**: nenhuma. A geração do código a partir do contrato roda sem rede (FR-002); tema, fontes e
  ícones vêm empacotados no próprio app; a política de segurança de conteúdo permite conexões só com o próprio
  endereço (FR-014), e os testes de ponta a ponta falham diante de qualquer requisição externa (FR-020).
- **Permissions**: esta feature não decide permissões. O backoffice envia a sessão da equipe e o token contra
  falsificação; a API (AUTH-07, PUB-02) é quem aceita ou recusa. Respostas "não autenticado" e "sem permissão" só
  mudam a navegação e a mensagem (FR-006, FR-007).
- **Accessibility**: verificação automática sem violações sérias ou críticas no portal, uso completo por teclado,
  foco no título ao trocar de etapa, erros anunciados e ligados ao campo, contraste de 4,5:1, idioma pt-BR, zoom de
  200% e largura de 320 px (FR-021 a FR-025); avisos de erro anunciados por leitores de tela (FR-005).

### Key Entities _(include if feature involves data)_

- **Configuração do app**: endereço da API e política de credenciais de cada app (portal sem cookies, backoffice com
  sessão), carregada quando o app inicia.
- **Erro padronizado da API**: código de status, tipo, mensagem e identificador da requisição, definido pela API
  (TRV-01) e convertido em mensagem para a pessoa.
- **Credencial de acompanhamento do denunciante**: obtida na consulta com protocolo e chave, válida só para uma
  denúncia, mantida apenas em memória e descartada ao fechar ou recarregar a página.
- **Contrato da API**: descrição publicada pela API (TRV-11), versionada no repositório, da qual vêm os tipos e as
  chamadas usados pelos apps.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Em 100% das execuções dos testes de ponta a ponta, nenhuma requisição sai para domínio diferente do app
  ou da API.
- **SC-002**: Navegando por 100% das rotas dos dois apps, em dois navegadores diferentes, o console mostra zero
  violações da política de segurança de conteúdo.
- **SC-003**: Depois do fluxo completo, o armazenamento do navegador está vazio e nenhuma URL contém protocolo, chave
  ou texto do relato, em 100% das execuções.
- **SC-004**: 100% dos códigos de erro tratados mostram mensagem em português que diz o que aconteceu e o que fazer,
  com o identificador para suporte quando disponível, e zero corpos de requisição ou resposta aparecem no console.
- **SC-005**: Todas as rotas do portal têm zero violações sérias ou críticas de acessibilidade, podem ser usadas do
  início ao fim só com teclado e funcionam com zoom de 200% e em 320 px de largura.
- **SC-006**: 100% das divergências entre o contrato versionado e o código gerado são detectadas antes da integração
  na branch principal.
- **SC-007**: No ambiente local, 100% das ações administrativas que alteram dados levam a proteção contra
  falsificação e são aceitas pela API.
- **SC-008**: Uma pessoa que recebe uma mensagem de erro consegue identificar o próximo passo sem ajuda, conferido em
  revisão das mensagens contra a regra "o que aconteceu e como resolver" da constituição.

## Assumptions

- **Dependências do backend**: o formato padrão de erro vem de TRV-01; as convenções de rota pública e administrativa
  de TRV-07; a paginação por cursor, que os componentes de lista vão consumir, de TRV-08; o contrato publicado de
  TRV-11; a proteção contra falsificação e as regras de origem de AUTH-07; e a credencial do denunciante de PUB-02.
  Enquanto essas tarefas não estiverem prontas, o front trabalha com um contrato versionado e respostas simuladas nos
  testes; a etapa só fecha quando o backend correspondente estiver pronto (ordem de implementação do backlog, etapa 1).
- **Fora do escopo**: a extração dos textos para tradução (FTRV-08, marco Evolução) fica para depois; os textos
  continuam em português no próprio app. Também ficam fora as telas de negócio (wizard, acompanhamento, backoffice),
  que são features seguintes. Spam/abuso e login de denunciante seguem fora do escopo do projeto.
- **Decisões técnicas para o plano**: a ferramenta de geração do código a partir do contrato (FTRV-01) e o padrão de
  gerenciamento de estado (FTRV-10) são decididos e registrados na etapa de planejamento, porque não mudam o
  comportamento visível descrito aqui.
- **Testes de ponta a ponta**: rodam isolados da máquina de desenvolvimento (que não suporta a ferramenta de teste de
  navegador diretamente) e no ambiente de integração contínua.
- **Navegadores**: as versões atuais de dois navegadores de mercado (Chrome e Firefox) são a referência para a
  validação da política de segurança.
- **Acessibilidade do backoffice**: segue as mesmas regras do portal, sem exigência formal de conformidade.
- **Recarregar a página no acompanhamento** exige nova consulta com protocolo e chave; isso é intencional, porque nada
  pode ficar guardado no navegador.
