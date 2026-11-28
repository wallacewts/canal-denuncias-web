# Feature Specification: Acesso da equipe ao backoffice

**Feature Branch**: `main` (sem branch de feature, por decisão do usuário)

**Created**: 2026-11-28

**Status**: Draft

**Input**: Etapa 4 da ordem de implementação do backlog do front (`docs/tarefas/README.md`), "Backoffice, acesso":
BAUTH-01 a BAUTH-07 (`docs/tarefas/05-backoffice-auth.md`) e BPRF-01 e BPRF-02 (`docs/tarefas/12-perfil.md`). Os IDs,
os critérios de aceite dessas tarefas e as decisões do registro (`canal-denuncias-api/docs/adr/README.md`: D20, D21,
D35, D38, D39, D47, D52, D53 e D54; ADR `0053-autenticacao-e-autorizacao.md`) valem como requisitos. Ficam fora, por
serem do marco Produção: BAUTH-08 (aviso de excesso de tentativas) e BPRF-03 (sessões ativas).

## Clarifications

### Session 2026-11-28

- Q: A etapa da senha mostra mensagem própria quando a conta está temporariamente bloqueada ou passa do limite de
  tentativas? → A: não; a resposta é a mesma da senha errada (o limite de tentativas chega como 429 da API e recebe a
  mesma mensagem genérica). Só o desafio do segundo fator tem mensagem própria de bloqueio (423).

- Q: O que decide o menu e as rotas — os perfis declarados em cada rota do front (BAUTH-05) ou as permissões efetivas
  que a API devolve em `/me` (USERS-07)? → A: as permissões efetivas devolvidas pela API em `/me` (o BAUTH-05 do
  backlog do front passa de `roles` para permissões).
- Q: Como o front sabe quando a sessão expira? → A: a API informa os horários de expiração (por inatividade e absoluta)
  no `/me` e nas respostas do login. A proposta, junto com as premissas de contrato do login, é registrada no backlog da
  API pelo agente do backend.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Entrar com senha e segundo fator (Priority: P1)

Uma pessoa da equipe abre o backoffice, informa e-mail e senha e, em seguida, o código de seis dígitos do aplicativo
autenticador (ou um código de recuperação). Só depois disso ela entra nas telas internas. Qualquer erro de credencial
recebe a mesma mensagem genérica, sem revelar se o e-mail existe, se a conta está bloqueada ou desativada.

**Why this priority**: sem isso nenhuma tela do backoffice pode ser usada com segurança. É a porta de entrada de todo o
trabalho da equipe e a primeira linha de proteção das denúncias (BAUTH-01, BAUTH-02).

**Independent Test**: com o simulador, entrar com uma conta que já tem o segundo fator cadastrado, informar o código e
chegar ao painel; repetir com senha errada, e-mail inexistente, conta bloqueada e código errado e conferir a mesma
mensagem genérica em todos os casos.

**Acceptance Scenarios**:

1. **Given** uma conta ativa com segundo fator cadastrado, **When** a pessoa informa e-mail e senha corretos, **Then**
   a tela pede o código do aplicativo autenticador, com campo de seis dígitos que o navegador e o celular reconhecem
   como código de uso único.
2. **Given** a tela do código, **When** a pessoa informa um código válido, **Then** entra no backoffice, na página que
   tentou abrir antes do login (ou no painel, se não havia nenhuma).
3. **Given** a tela do código, **When** a pessoa escolhe "Usar um código de recuperação" e informa um código válido,
   **Then** entra no backoffice do mesmo jeito.
4. **Given** e-mail inexistente, senha errada, conta bloqueada, conta desativada ou excesso de tentativas, **When** a pessoa tenta entrar,
   **Then** vê sempre a mesma mensagem, "E-mail ou senha inválidos", sem nenhuma diferença de texto, campo destacado ou
   comportamento.
5. **Given** código errado no segundo fator, **When** a pessoa envia, **Then** vê uma mensagem genérica de código
   inválido; depois de muitas falhas seguidas, vê a mensagem de bloqueio temporário, sem dizer o motivo.
6. **Given** a pessoa entrou, **When** qualquer tela do backoffice faz uma chamada à API, **Then** a sessão segue só
   pelo cookie protegido da API: o front nunca lê, recebe nem guarda um token.

---

### User Story 2 - Primeiro acesso: trocar a senha provisória e cadastrar o segundo fator (Priority: P1)

Uma pessoa recém-cadastrada pelo administrador entra com a senha provisória. O backoffice a leva, em sequência, para
trocar a senha e cadastrar o aplicativo autenticador. Ela vê o QR code e o segredo para digitação manual, confirma com
um código válido e recebe os 10 códigos de recuperação, exibidos uma única vez, com opções de copiar e baixar. Só depois
de confirmar que guardou os códigos ela entra.

**Why this priority**: o segundo fator é obrigatório (D53). Sem o primeiro acesso, nenhuma conta nova consegue entrar,
inclusive a do primeiro administrador criado pelo comando `create-admin` (BAUTH-03, BAUTH-04).

**Independent Test**: com o simulador, entrar com uma conta nova, trocar a senha, cadastrar o segundo fator, guardar
os códigos de recuperação e chegar ao painel; conferir que segredo e códigos não aparecem em URL, armazenamento do
navegador ou console e somem ao sair da tela.

**Acceptance Scenarios**:

1. **Given** uma conta com troca de senha obrigatória, **When** a pessoa entra com a senha provisória, **Then** vai
   para a troca de senha antes de qualquer outra tela.
2. **Given** a troca de senha, **When** a pessoa digita a nova senha, **Then** vê a política de senha (mínimo de 12
   caracteres e recusa de senhas comuns) e é avisada antes do envio se a nova senha não atende à parte que dá para
   conferir na tela; a confirmação precisa ser igual à nova senha.
3. **Given** a senha trocada e o segundo fator ainda não cadastrado, **When** a troca termina, **Then** a pessoa vai
   para o cadastro do aplicativo autenticador.
4. **Given** o cadastro, **When** a tela abre, **Then** mostra o QR code e o segredo em texto para digitação manual, com
   instruções curtas.
5. **Given** o cadastro, **When** a pessoa informa um código inválido, **Then** o segundo fator não é ativado, o erro
   aparece no campo, sem encerrar a sessão, e ela pode tentar de novo; **When** informa um código válido, **Then** o segundo fator é ativado.
6. **Given** o segundo fator ativado, **When** a confirmação termina, **Then** a tela mostra os 10 códigos de
   recuperação uma única vez, com "Copiar" e "Baixar arquivo", e só libera "Continuar" depois que a pessoa marca que
   guardou os códigos.
7. **Given** o segredo ou os códigos na tela, **When** a pessoa sai da tela (continuando, voltando ou fechando),
   **Then** segredo e códigos são apagados da memória e não reaparecem.

---

### User Story 3 - Telas protegidas e menu por permissão (Priority: P1)

Toda tela interna exige sessão válida com segundo fator verificado. Quem não está autenticado é levado para o login, e
o caminho que tentou abrir é lembrado só para depois do login. O menu mostra apenas o que a pessoa pode abrir, mas a API
continua sendo a autoridade: um 403 dela é tratado com mensagem clara.

**Why this priority**: resolve a pendência deixada na feature 001 (todas as telas internas abertas a qualquer um) e é
pré-requisito de todas as telas de tratativa (BAUTH-05).

**Independent Test**: abrir uma tela interna sem sessão e conferir o redirecionamento ao login e o retorno depois dele;
entrar com perfis diferentes e conferir o menu; forçar um 403 do simulador e conferir a mensagem.

**Acceptance Scenarios**:

1. **Given** nenhuma sessão, **When** a pessoa abre qualquer tela interna, **Then** vai para o login; depois de entrar,
   volta para a tela que tentou abrir.
2. **Given** uma sessão com segundo fator pendente ou troca de senha pendente, **When** a pessoa tenta abrir uma tela
   interna, **Then** é levada para a etapa que falta.
3. **Given** uma pessoa autenticada, **When** o menu aparece, **Then** mostra só os itens que o acesso dela permite,
   conforme as permissões efetivas que a API devolve no perfil do usuário.
4. **Given** uma pessoa que abre pelo endereço uma tela que o acesso dela não permite, **When** a tela carrega, **Then**
   vê uma mensagem de acesso negado, sem dados da tela.
5. **Given** qualquer tela, **When** a API responde 403, **Then** a pessoa vê a mensagem de acesso negado da base de
   erros (feature 001), sem perder a sessão.

---

### User Story 4 - Expiração da sessão e saída (Priority: P1)

A sessão termina depois de 15 minutos sem uso ou 8 horas no total. Um minuto antes dos 15 minutos sem uso, a pessoa vê
um aviso com a opção de continuar. Ao expirar, sair ou receber 401, todos os dados de denúncias são apagados da memória
e a pessoa volta para o login com uma mensagem. Sair numa aba encerra também as outras abas abertas.

**Why this priority**: um computador da equipe esquecido aberto expõe denúncias. A expiração e a saída precisam
apagar tudo, e a regra é da constituição do front (restrições técnicas) e da D53 (BAUTH-06, BAUTH-07).

**Independent Test**: com relógio controlado, ficar 14 minutos sem usar e conferir o aviso; continuar e conferir que a
sessão segue; ficar mais 1 minuto e conferir o retorno ao login com a mensagem e a memória limpa; abrir duas abas, sair
numa e conferir que a outra também volta ao login.

**Acceptance Scenarios**:

1. **Given** 14 minutos sem nenhuma chamada à API, **When** o tempo passa, **Then** aparece um aviso de que a sessão
   vai terminar em 1 minuto, com "Continuar" e "Sair".
2. **Given** o aviso, **When** a pessoa escolhe "Continuar", **Then** a sessão é renovada na API e o aviso some.
3. **Given** 15 minutos sem uso, 8 horas desde o login ou um 401 da API, **When** isso acontece, **Then** a pessoa volta
   ao login com uma mensagem única de sessão encerrada e nenhum dado de denúncia continua na memória.
4. **Given** uma pessoa autenticada, **When** ela clica em "Sair", **Then** a sessão é encerrada na API, a memória é
   limpa e ela volta ao login; se a chamada à API falhar, a memória é limpa do mesmo jeito.
5. **Given** duas ou mais abas do backoffice abertas, **When** a pessoa sai ou a sessão expira em uma delas, **Then** as
   outras também voltam ao login e limpam a memória, sem usar armazenamento do navegador.
6. **Given** uma pessoa usando o backoffice numa aba, **When** outra aba está parada, **Then** o aviso de expiração não
   aparece na aba parada enquanto a sessão estiver sendo usada na outra.
7. **Given** a aproximação das 8 horas desde o login, **When** faltar 1 minuto, **Then** a pessoa é avisada de que a
   sessão vai terminar e de que precisará entrar de novo, sem opção de continuar. O momento do aviso vem do horário de expiração absoluta informado pela API.

---

### User Story 5 - Meu perfil e troca de senha (Priority: P2)

A pessoa vê os próprios dados (nome, e-mail, perfis e data de ativação do segundo fator) e pode trocar a senha,
reaproveitando o formulário do primeiro acesso. Depois da troca, é avisada de que a sessão foi renovada e de que as
outras sessões dela foram encerradas.

**Why this priority**: necessário para a equipe manter a própria conta, mas não bloqueia o trabalho do dia a dia
(BPRF-01, BPRF-02).

**Independent Test**: abrir o perfil e conferir os dados; trocar a senha e conferir o aviso de sessão renovada.

**Acceptance Scenarios**:

1. **Given** uma pessoa autenticada, **When** abre "Meu perfil", **Then** vê nome, e-mail, perfis e a data de ativação
   do segundo fator.
2. **Given** o perfil, **When** a pessoa troca a senha com sucesso, **Then** vê o aviso de que a sessão foi renovada e de
   que as outras sessões foram encerradas.
3. **Given** o perfil, **When** a troca falha por senha atual errada (erro no campo da senha atual, sem encerrar a
   sessão) ou senha nova fora da política, **Then** vê a
   mensagem correspondente e os campos de senha são limpos.
4. **Given** a troca de senha, **When** a pessoa erra a senha atual pela 5ª vez na mesma sessão, **Then** a API encerra
   a sessão e ela volta ao login com a mensagem de sessão encerrada; até a 4ª vez, o erro aparece no campo.

---

### Edge Cases

- **Clique duplo** em "Entrar", no envio do código ou na troca de senha: uma única chamada.
- **API fora do ar ou lenta** no login: mensagem genérica de indisponibilidade, sem perder o e-mail digitado; a senha
  é limpa.
- **Código do autenticador expirando** entre a digitação e o envio: a API recusa e a pessoa digita o código seguinte,
  sem voltar à senha.
- **Sessão de segundo fator pendente expira** na tela do código: volta para e-mail e senha com a mensagem de sessão
  encerrada.
- **Recarregar a página** na tela dos códigos de recuperação: os códigos não reaparecem; a tela informa que eles já
  foram exibidos e não podem ser vistos de novo.
- **Cópia negada** pelo navegador: a tela orienta a selecionar e copiar manualmente ou baixar o arquivo.
- **Voltar do navegador** depois de sair ou expirar: nenhuma tela interna é mostrada com dados; vai para o login.
- **Caminho de retorno** apontando para fora do backoffice ou para o próprio login: ignorado, vai para o painel.
- **Perfil retirado durante o uso**: a próxima chamada recebe 403 e a tela mostra acesso negado; a navegação seguinte já
  reflete o novo acesso.
- **Conta desativada durante o uso**: a próxima chamada recebe 401 e a sessão termina com a mensagem de sessão
  encerrada.
- **Duas abas fazendo login ao mesmo tempo**: a última sessão vale; a outra aba recebe 401 e volta ao login.

## Requirements _(mandatory)_

### Functional Requirements

**Entrada (BAUTH-01, BAUTH-02)**

- **FR-001**: O login DEVE pedir e-mail e senha e mostrar sempre a mesma mensagem genérica para qualquer falha de
  credencial (e-mail inexistente, senha errada, conta bloqueada ou desativada, bloqueio temporário por falhas e excesso
  de tentativas). A etapa da senha NÃO tem mensagem própria de bloqueio.
- **FR-002**: Depois da senha, o backoffice DEVE seguir para a etapa que a API indicar: troca de senha obrigatória,
  cadastro do segundo fator ou desafio do segundo fator.
- **FR-003**: O desafio do segundo fator DEVE aceitar o código de seis dígitos do autenticador ou um código de
  recuperação, com campo reconhecido como código de uso único e teclado numérico no celular.
- **FR-004**: Código errado no segundo fator DEVE mostrar mensagem genérica no campo, sem encerrar a sessão; o bloqueio
  temporário DEVE ter mensagem própria, sem dizer o motivo.
- **FR-005**: O front NÃO DEVE ler, receber, guardar ou enviar token de sessão; a sessão segue só pelo cookie protegido
  da API.

**Primeiro acesso (BAUTH-03, BAUTH-04)**

- **FR-006**: Conta com troca de senha obrigatória DEVE passar pela troca antes das telas internas. Sem segundo fator,
  a troca vem primeiro e depois o cadastro; com segundo fator já cadastrado (senha redefinida), o desafio vem primeiro
  e depois a troca. A ordem é a que a API indica.
- **FR-007**: A troca de senha DEVE pedir senha atual, nova e confirmação, exibir a política (mínimo de 12 caracteres e
  recusa de senhas comuns) e validar na tela o que for possível (tamanho e confirmação); a recusa por senha comum vem
  da API, que é a autoridade.
- **FR-008**: O cadastro do segundo fator DEVE mostrar o QR code fornecido pela API e o segredo em texto, e ativar o
  segundo fator só depois de um código válido.
- **FR-009**: Depois da ativação, a tela DEVE mostrar os 10 códigos de recuperação uma única vez, com copiar e baixar
  um arquivo de texto gerado no navegador, e liberar a continuação só depois de a pessoa confirmar que guardou os
  códigos.
- **FR-010**: Segredo e códigos de recuperação DEVEM ser apagados da memória ao sair da tela e NÃO DEVEM reaparecer ao
  voltar ou recarregar.

**Telas protegidas e permissões (BAUTH-05)**

- **FR-011**: Toda tela interna DEVE exigir sessão válida com segundo fator verificado; sem ela, a pessoa vai para o
  login e o caminho que tentou abrir é guardado só em memória, para depois do login.
- **FR-012**: Sessão com troca de senha ou segundo fator pendente DEVE ser levada à etapa que falta, sem acesso às
  telas internas, enquanto a etapa estiver em memória; depois de recarregar a página, a sessão pendente antes do
  segundo fator não é restaurável e a pessoa vai para o login. A troca de senha exigida depois do segundo fator volta
  pelo `/me` (`passwordChangeRequired: true`) e a pessoa continua na troca.
- **FR-013**: O menu e o acesso às rotas DEVEM ser decididos pelas permissões efetivas devolvidas pela API no perfil do
  usuário (`GET /me`); cada rota declara a permissão que exige, e o front não copia a matriz de perfis × telas da API.
- **FR-014**: A API continua sendo a autoridade: uma tela aberta pelo endereço sem permissão e qualquer 403 DEVEM
  mostrar acesso negado sem dados, mantendo a sessão.
- **FR-015**: O perfil da pessoa autenticada (dados e acesso) DEVE ser carregado da API ao entrar e mantido só em
  memória, sendo descartado ao sair ou expirar.

**Expiração e saída (BAUTH-06, BAUTH-07)**

- **FR-016**: Um minuto antes dos 15 minutos sem uso, o backoffice DEVE mostrar um aviso com "Continuar" e "Sair";
  "Continuar" DEVE renovar a sessão na API.
- **FR-017**: Os horários de expiração (por inatividade e absoluta) DEVEM vir da API, no perfil do usuário e nas
  respostas do login; o aviso de inatividade e o aviso do limite de 8 horas (este sem opção de continuar) usam esses
  horários, e o front não calcula a regra por conta própria.
- **FR-018**: Ao expirar, receber 401 ou sair, o backoffice DEVE apagar da memória todos os dados de denúncias e do
  perfil e voltar ao login com uma única mensagem.
- **FR-019**: "Sair" DEVE encerrar a sessão na API e limpar a memória mesmo se a chamada falhar.
- **FR-020**: Sair ou expirar numa aba DEVE encerrar as outras abas abertas do backoffice, e o uso numa aba DEVE evitar
  o aviso de expiração nas outras, sem armazenamento do navegador.
- **FR-021**: O botão voltar do navegador depois de sair ou expirar NÃO DEVE mostrar telas internas com dados.

**Meu perfil (BPRF-01, BPRF-02)**

- **FR-022**: "Meu perfil" DEVE mostrar nome, e-mail, perfis e a data de ativação do segundo fator.
- **FR-023**: A troca de senha do perfil DEVE reaproveitar o formulário do primeiro acesso, tratar a senha atual errada
  (422 `CURRENT_PASSWORD_INVALID`) como erro no campo, sem encerrar a sessão, e o 429 (5 erros de senha atual na mesma
  sessão, sessão encerrada pela API) como encerramento, voltando ao login com a mensagem de sessão encerrada, e, depois do sucesso, avisar
  que a sessão foi renovada e que as outras sessões foram encerradas.

**Simulador e integração**

- **FR-024**: Enquanto os endpoints de autenticação não existirem no contrato da API, a feature DEVE funcionar contra o
  simulador de desenvolvimento e testes, com os formatos do backlog da API; nada do simulador pode chegar ao build de
  produção.
- **FR-025**: A troca do simulador pela API real (cliente gerado do contrato) DEVE ficar em tarefas bloqueadas até
  AUTH-01 a AUTH-07 e USERS-07 saírem no contrato.
- **FR-026**: O simulador DEVE recusar chamadas administrativas que alteram dados vindas de outra origem, do mesmo jeito
  que a proteção nativa da API (AUTH-07), para que os testes de ponta a ponta provem que o backoffice faz as chamadas
  na mesma origem, pelo proxy `/api`.

**Qualidade**

- **FR-027**: Todos os testes de ponta a ponta desta feature DEVEM rodar com as guardas de privacidade da feature 001
  (nenhuma requisição externa, nada em URL, armazenamento ou console, nenhuma violação de CSP).
- **FR-028**: As telas desta feature DEVEM atender a WCAG 2.1 AA (rótulos, foco visível, erros anunciados, navegação só
  com teclado), com teste automatizado de acessibilidade.

### Privacy & Security _(mandatory)_

- **Sensitive data on screen**: e-mail e senha (login e troca de senha), código do autenticador e código de
  recuperação (desafio), segredo do autenticador e QR code (cadastro), os 10 códigos de recuperação (uma única vez) e
  os dados do perfil. Todos são necessários para autenticar com segundo fator obrigatório (D53). Senhas e códigos são
  limpos dos campos depois de cada envio; segredo e códigos de recuperação somem da memória ao sair da tela.
- **Storage and URL**: nada desta feature vai para a URL (inclusive o caminho de retorno, guardado só em memória),
  `localStorage`, `sessionStorage`, IndexedDB, cookies legíveis pelo JavaScript ou console. A sessão é só o cookie
  `HttpOnly`/`Secure`/`SameSite=Strict` da API (D53), que o front não lê. A sincronização entre abas usa um canal de
  mensagens do navegador, sem armazenamento, e só transmite eventos (saída, expiração, atividade), nunca dados. O
  arquivo dos códigos de recuperação é gerado no navegador, com nome fixo que não identifica a pessoa.
- **External requests**: nenhuma. O QR code vem da API como imagem embutida (permitida pela CSP atual em
  `img-src data:`); nenhum serviço externo gera QR code. Nenhum asset novo de terceiros.
- **Permissions**: a API protege cada ação (login, desafio, cadastro do segundo fator, troca de senha, perfil e saída) e
  é a autoridade das permissões (D54, negação por padrão). O front só reflete: esconde o que a pessoa não pode abrir e
  trata 401 e 403. Ninguém altera os próprios perfis (D21) — esta feature não oferece edição de perfis.
- **Accessibility**: campos com rótulo visível e associação de erro; foco no título ao trocar de etapa (login → código
  → cadastro → códigos de recuperação); mensagens de erro e o aviso de expiração anunciados por leitor de tela sem
  roubar o foco de quem está digitando; QR code com alternativa em texto (o segredo para digitação manual); tudo
  operável só com teclado; contraste e zoom de 200% conforme a feature 001.

### Key Entities _(include if feature involves data)_

- **Etapa de acesso**: em que ponto a pessoa está depois da senha — troca de senha obrigatória, cadastro do segundo
  fator, desafio do segundo fator ou acesso liberado. Informada pela API; o front só navega.
- **Usuário atual**: id, nome, e-mail, perfis, situação do segundo fator (com data de ativação), se a troca de senha é
  obrigatória e o acesso efetivo. Só em memória, descartado ao sair ou expirar.
- **Cadastro do segundo fator**: QR code, segredo em texto e, depois da confirmação, os 10 códigos de recuperação.
  Existe só enquanto a tela de cadastro está aberta.
- **Estado da sessão no front**: hora da última atividade, situação do aviso de expiração e motivo do encerramento
  (expiração, saída, 401). Não contém nenhum token.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Uma pessoa da equipe com o segundo fator já cadastrado entra no backoffice em menos de 30 segundos, sem
  ajuda.
- **SC-002**: Uma pessoa nova completa o primeiro acesso (troca de senha, cadastro do segundo fator e guarda dos códigos)
  em menos de 5 minutos, sem ajuda.
- **SC-003**: Em 100% das tentativas com e-mail inexistente, senha errada, conta bloqueada, conta desativada e excesso
  de tentativas na etapa da senha (429), a mensagem e o comportamento da tela são idênticos.
- **SC-004**: Em 100% dos encerramentos (expiração por inatividade, limite de 8 horas, 401, 429 da 5ª senha atual
  errada na troca de senha e saída), nenhum dado de
  denúncia ou do perfil permanece acessível na tela, na memória da aplicação ou no histórico de navegação.
- **SC-005**: 100% das telas internas recusam acesso sem sessão válida com segundo fator verificado.
- **SC-006**: Nenhum teste de ponta a ponta desta feature registra requisição externa, dado sensível em URL,
  armazenamento ou console, ou violação de CSP.
- **SC-007**: As telas desta feature passam no teste automatizado de acessibilidade sem violações e podem ser usadas do
  início ao fim só com o teclado.

## Assumptions

- **Contrato da API (premissas a confirmar na integração):** a resposta do login e do desafio indica a próxima etapa
  em código (troca de senha, cadastro do segundo fator, desafio ou acesso liberado); o desafio distingue "código
  inválido" de "bloqueio temporário" por código de resposta, sem revelar o motivo; o cadastro devolve o QR code como
  imagem embutida e o segredo em texto; a confirmação devolve os 10 códigos de recuperação; `GET /me` devolve os dados
  do USERS-07. o `/me` e as respostas do login trazem os horários de expiração (por inatividade e absoluta) e as permissões efetivas.
  Essas premissas são registradas no backlog da API pelo agente do backend, como nas features 002 e 003, e conferidas na
  integração.
- **Ordem das etapas:** no primeiro acesso, troca de senha antes do cadastro do segundo fator (BAUTH-04). Quem já tem
  segundo fator e precisa trocar a senha (senha redefinida pelo administrador) passa pelo desafio primeiro e depois
  pela troca (decisão do backend, feature 006). O front segue a etapa que a API devolve.
- **Erros de digitação e 401 (decisão do backend, feature 006):** código do autenticador errado é `422 MFA_CODE_INVALID`
  no desafio e na confirmação do cadastro, mostrado no campo sem encerrar a sessão; `401` significa só sessão ausente ou
  expirada em todo o fluxo. A troca de senha tem também `PASSWORD_SAME_AS_CURRENT`, com mensagem própria. Rota de etapa
  fora de hora responde `403 STEP_NOT_ALLOWED` (o front leva à etapa certa, sem encerrar a sessão); com a troca de senha
  pendente depois do segundo fator, as demais rotas respondem `403 PASSWORD_CHANGE_REQUIRED` (o front leva à troca, sem
  a tela de acesso negado). O desafio também pode responder `429`, com a mensagem genérica de excesso de tentativas.
- **Proteção contra falsificação de requisição:** a API usa a proteção nativa do Nest 12 por origem (AUTH-07, ADR 0053:
  escrita administrativa de outra origem é recusada), somada ao cookie `SameSite=Strict`. O backoffice já chama a API na
  mesma origem, pelo proxy `/api` (D38). O token de cabeçalho configurado na feature 001 fica inerte (a API não o
  emite). A T058 da feature 001 (e2e do XSRF contra a API real) continua bloqueada pelo AUTH-07 e passa a provar a
  recusa por origem; contra o simulador, esta feature prova o mesmo comportamento (FR-026).
  **Atualização (2026-11-28, D63):** a configuração de token XSRF foi removida da lib (`withNoXsrfProtection()` no
  `provideApi`), e a T058 foi provada contra a API real pela T049.
- **Sem recuperação de senha por e-mail:** não há "esqueci minha senha" no backlog; senha perdida é redefinida pelo
  administrador (feature de usuários). Fora do escopo.
- **Bloqueio na etapa da senha:** conta com bloqueio temporário por falhas de senha e excesso de tentativas (429 da API)
  recebem, no login, a **mesma** mensagem genérica de senha errada, sem mensagem própria de bloqueio, para não revelar se
  o e-mail existe (decisão do usuário, 2026-11-28). O aviso com o tempo de espera (BAUTH-08, Produção) fica fora do
  escopo. O bloqueio do desafio do segundo fator continua com mensagem própria (423), porque ali a senha já foi provada.
- **Sessões ativas (BPRF-03):** fora do escopo (Produção).
- **Pendência herdada:** o guard de autenticação marcado como TODO na feature 001 é resolvido aqui (US3).
- **Simulador:** o mesmo simulador das features 002 e 003, isolado por sessão de teste e sem chegar ao build de produção
  (sentinelas do `check:build`).
