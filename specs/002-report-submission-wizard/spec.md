# Feature Specification: Envio de denúncia pelo portal (wizard, início e protocolo)

**Feature Branch**: `main` (sem branch de feature, decisão do usuário; diretório `specs/002-report-submission-wizard`)

**Created**: 2026-11-28

**Status**: Draft

**Input**: User description: conteúdo de `docs/tarefas/01-portal-nova-denuncia.md` (PNEW-01 a PNEW-06), mais PINF-01
(`docs/tarefas/04-portal-paginas-institucionais.md`) e PACC-01 (`docs/tarefas/02-portal-protocolo-e-consulta.md`).
PNEW-07 (anexos) e PNEW-08 (identificação opcional) ficam fora, por serem do marco Produção. Os IDs de tarefa, os
critérios de aceite, as regras de `docs/tarefas/README.md` e as decisões D05, D06, D22 e D34 a D39 do registro de
decisões (`canal-denuncias-api/docs/adr/README.md`) valem como requisitos desta feature. Decisão do usuário (opção A):
os endpoints de que o wizard depende (CAT-01, REP-01 e REP-02) ainda não existem na API; a feature é construída e
testada contra respostas simuladas baseadas nesses endpoints do backlog, e a integração real fica bloqueada até eles
saírem no contrato da API.

## Clarifications

### Session 2026-11-28

- Q: O rascunho deve ser descartado automaticamente após um período sem atividade, para proteger quem usa um
  computador compartilhado? → A: Opção B. Depois de 30 minutos sem atividade o rascunho é descartado. Aos 25 minutos a
  pessoa recebe um aviso com a opção de continuar, que reinicia a contagem.
- Q: A regra de inatividade vale também para a tela do protocolo? → A: Sim. Depois de 30 minutos sem atividade
  (aviso aos 25), protocolo e chave são apagados da memória e a tela passa a mostrar só o aviso de que não podem mais
  ser exibidos.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Denunciante relata um incidente e recebe protocolo e chave (Priority: P1)

Uma pessoa (colaborador, parceiro ou terceiro) entra no portal, escolhe o tipo de denunciante e a categoria, descreve o
incidente, informa opcionalmente os envolvidos, revisa tudo e envia. Em seguida vê o protocolo e a chave de
acompanhamento uma única vez, pode copiá-los ou baixá-los num arquivo de texto, confirma que os guardou e sai. Em nenhum
momento o relato, o protocolo ou a chave passam pela barra de endereço, pelo título da página, pelo console ou pelo
armazenamento do navegador.

**Why this priority**: é a razão de existir do canal. Sem o envio, nenhuma outra tela do portal tem uso. Também é onde
o anonimato mais pode falhar (texto livre, credencial exibida na tela), por isso precisa nascer com as garantias de
privacidade.

**Independent Test**: percorrer o fluxo completo contra respostas simuladas da API, do início até a saída da tela do
protocolo, verificando a cada etapa a URL, o título, o armazenamento do navegador, o console e o tráfego de rede.
Entrega valor sozinho: com a API real disponível, é o fluxo completo de envio.

**Acceptance Scenarios**:

1. **Given** a pessoa no início do wizard, **When** escolhe Colaborador, Parceiro ou Terceiro, **Then** a escolha é
   enviada como `EMPLOYEE`, `PARTNER` ou `THIRD_PARTY` e um texto explica que a escolha não identifica a pessoa
   (PNEW-02).
2. **Given** a etapa de categoria, **When** ela abre, **Then** mostra nome e descrição de cada categoria ativa, na ordem
   recebida da API (PNEW-03, CAT-01).
3. **Given** a etapa de relato, **When** a pessoa digita a descrição, **Then** um contador mostra o tamanho, e só é
   possível avançar com 100 a 10.000 caracteres; os demais textos aceitam até 2.000 caracteres (PNEW-04, REP-02).
4. **Given** a etapa de relato, **When** a pessoa informa quando aconteceu, **Then** pode escolher uma data exata ou só
   mês e ano (PNEW-04).
5. **Given** a etapa de envolvidos, **When** a pessoa a pula ou adiciona até 20 envolvidos com nome e função opcionais,
   **Then** pode seguir para a revisão nos dois casos (PNEW-05).
6. **Given** a revisão, **When** a pessoa confere os dados, **Then** vê tudo o que será enviado, com um link para
   editar cada etapa e um link para o aviso de privacidade antes do botão de enviar (PNEW-06).
7. **Given** a revisão, **When** a pessoa envia e a API responde com sucesso, **Then** o botão fica desabilitado durante
   o envio, o rascunho é apagado e a pessoa vai para a tela do protocolo (PNEW-06).
8. **Given** a tela do protocolo aberta logo após o envio, **When** ela é exibida, **Then** mostra protocolo, chave e
   data de recebimento (só o dia), com um aviso claro de que a chave não pode ser recuperada (PACC-01, D05, D06).
9. **Given** a tela do protocolo, **When** a pessoa usa "copiar" ou "baixar", **Then** o valor é copiado com retorno
   visual e anunciado, ou um arquivo de texto é gerado no próprio navegador, sem nenhuma chamada ao servidor (PACC-01).
10. **Given** a tela do protocolo, **When** a pessoa tenta sair pelo botão sem marcar "Guardei o protocolo e a chave",
    **Then** não consegue; depois de marcar e sair, protocolo e chave são apagados da memória (PACC-01).

---

### User Story 2 - O rascunho nunca deixa rastro e não se perde por engano (Priority: P1)

Enquanto preenche o wizard, a pessoa pode avançar e voltar entre as etapas, editar o que já escreveu e consultar o aviso
de privacidade sem perder o rascunho. O rascunho existe só na memória da página: recarregar ou fechar a aba o descarta,
e o portal avisa antes. Etapas obrigatórias não podem ser puladas digitando o endereço. Se o envio falhar, nada do que
foi escrito se perde.

**Why this priority**: o relato é o dado mais sensível do sistema e o mais trabalhoso de escrever. Guardá-lo no
navegador deixaria rastro num computador compartilhado; perdê-lo por um clique errado ou por um erro de rede faria a
pessoa desistir de denunciar.

**Independent Test**: preencher etapas, navegar para frente e para trás, abrir o aviso de privacidade, forçar erro de
envio e recarregar a página, verificando que o rascunho permanece quando deve, some quando deve, e nunca aparece no
armazenamento do navegador nem na URL.

**Acceptance Scenarios**:

1. **Given** um rascunho em andamento, **When** a pessoa navega entre as etapas, **Then** a barra de endereço mostra
   apenas o nome da etapa (por exemplo `/nova-denuncia/relato`) e os dados preenchidos continuam lá (PNEW-01).
2. **Given** uma etapa obrigatória ainda não preenchida, **When** a pessoa digita o endereço de uma etapa posterior,
   **Then** volta para a primeira etapa pendente (PNEW-01).
3. **Given** um rascunho com dados, **When** a pessoa tenta recarregar ou fechar a aba, **Then** o navegador avisa que o
   rascunho será perdido; se ela confirmar, nada é recuperável depois (PNEW-01).
4. **Given** a revisão, **When** a pessoa abre o aviso de privacidade, **Then** consegue lê-lo e voltar com o rascunho
   intacto (PNEW-06).
5. **Given** a revisão, **When** o envio falha (sem conexão, erro do servidor, validação recusada), **Then** o rascunho
   continua intacto e a mensagem de erro segue o padrão da base transversal, com a opção de tentar de novo (PNEW-06,
   FTRV-02).
6. **Given** a tela do protocolo, **When** a pessoa recarrega a página, **Then** vê só um aviso de que protocolo e chave
   não podem mais ser exibidos (PACC-01).
7. **Given** um rascunho em andamento, **When** a pessoa fica 25 minutos sem atividade, **Then** recebe um aviso
   acessível com a opção de continuar; se continuar, a contagem recomeça; se não responder e completar 30 minutos sem
   atividade, o rascunho é apagado e a pessoa volta ao início do wizard com uma mensagem explicando o motivo.

---

### User Story 3 - Página inicial explica o canal e as garantias (Priority: P2)

Quem chega ao portal entende, antes de começar, o que pode relatar, quem pode relatar e quais são as garantias:
sem cadastro, sem registro de IP, relato cifrado, identidade opcional e lacrada. Também recebe a recomendação de usar
um dispositivo e uma rede pessoais se quiser mais anonimato, e encontra os caminhos para fazer ou consultar uma
denúncia.

**Why this priority**: a confiança no canal depende de a pessoa entender o que acontece com os próprios dados antes
de escrever qualquer coisa (constituição, princípio IV). Vem depois do envio porque não entrega o relato em si.

**Independent Test**: abrir a página inicial e verificar os textos, os dois caminhos e a acessibilidade, sem depender
da API.

**Acceptance Scenarios**:

1. **Given** a página inicial, **When** ela abre, **Then** explica o que pode ser relatado (vazamento, prática
   inadequada, atividade suspeita) e quem pode relatar (colaborador, parceiro, terceiro) (PINF-01).
2. **Given** a página inicial, **When** a pessoa lê as garantias, **Then** encontra: sem cadastro, sem registro de IP,
   relato cifrado, identidade opcional e lacrada, e a recomendação de dispositivo e rede pessoais (PINF-01).
3. **Given** a página inicial, **When** a pessoa escolhe "Fazer uma denúncia" ou "Consultar uma denúncia", **Then** vai
   para o início do wizard ou para a tela de consulta (PINF-01).

---

### Edge Cases

- A lista de categorias não carrega (API fora do ar ou erro): a etapa mostra a mensagem de erro e uma opção de tentar de
  novo, sem perder o que já foi preenchido.
- A lista de categorias vem vazia: a etapa explica que não é possível enviar no momento e não deixa avançar.
- A pessoa clica duas vezes em enviar ou a rede está lenta: só uma denúncia é criada; o botão fica desabilitado até a
  resposta.
- A API recusa o envio por validação (por exemplo, limite de tamanho): o rascunho fica intacto e a mensagem orienta a
  revisar, sem repetir o texto enviado.
- A pessoa usa o botão voltar do navegador na tela do protocolo, antes de confirmar que guardou: o portal pergunta se
  ela quer mesmo sair, porque protocolo e chave não poderão ser exibidos de novo.
- A pessoa abre a tela do protocolo diretamente pelo endereço, sem ter enviado nada: vê só o aviso de que não há
  protocolo para exibir.
- A pessoa abandona o wizard indo para outra página do portal (início, ajuda): o portal avisa que o rascunho será
  descartado e, se ela confirmar, apaga o rascunho.
- A descrição tem exatamente 100 ou 10.000 caracteres, ou um texto opcional tem exatamente 2.000: aceitos; um caractere
  a mais é recusado com mensagem ligada ao campo.
- Já existem 20 envolvidos: o botão de adicionar fica indisponível e uma mensagem explica o limite.
- A cópia para a área de transferência é negada pelo navegador: a pessoa é orientada a selecionar o texto e copiar
  manualmente; o valor continua visível e selecionável.
- O texto colado na descrição contém caracteres especiais ou quebras de linha: é aceito como está e contado
  corretamente.

## Requirements _(mandatory)_

### Functional Requirements

**Rascunho e navegação do wizard (PNEW-01)**

- **FR-001**: O rascunho da denúncia MUST existir só na memória da página. Nada dele pode ir para armazenamento local,
  armazenamento de sessão, banco local do navegador, cookies, URL, título da página ou console.
- **FR-002**: A barra de endereço MUST mostrar apenas o nome da etapa atual (tipo, categoria, relato, envolvidos,
  revisão, protocolo).
- **FR-003**: O acesso a uma etapa por endereço MUST levar à primeira etapa obrigatória ainda pendente quando houver
  alguma antes dela.
- **FR-004**: Recarregar ou fechar a aba com um rascunho preenchido MUST disparar o aviso do navegador de que os dados
  serão perdidos.
- **FR-005**: Sair do wizard para outra página do portal com rascunho preenchido MUST pedir confirmação; ao confirmar, o
  rascunho é apagado.
- **FR-006**: Um indicador de progresso MUST mostrar o nome e o número da etapa atual e o total de etapas, de forma
  acessível a leitor de tela.
- **FR-007**: Ao trocar de etapa, o foco MUST ir para o título da nova etapa (pendência herdada da base transversal).
- **FR-008**: As etapas de anexos e de identificação MUST ficar ocultas, sem rota acessível, até as tarefas PNEW-07 e
  PNEW-08 existirem.
- **FR-009**: Depois de 25 minutos sem atividade no wizard (digitação, clique ou navegação entre etapas), o portal MUST
  mostrar um aviso acessível com a opção de continuar, que reinicia a contagem. Aos 30 minutos sem atividade, o
  rascunho MUST ser apagado e a pessoa MUST voltar ao início do wizard com uma mensagem explicando o motivo. A mesma
  regra vale para a revisão. Na tela do protocolo, a mesma contagem apaga protocolo e chave aos 30 minutos, e a tela
  passa a mostrar só o aviso de que eles não podem mais ser exibidos.

**Etapa: tipo de denunciante (PNEW-02)**

- **FR-010**: A etapa MUST oferecer Colaborador, Parceiro e Terceiro, enviados como `EMPLOYEE`, `PARTNER` e
  `THIRD_PARTY`, e exigir uma escolha para avançar.
- **FR-011**: A etapa MUST explicar que a escolha não identifica a pessoa.

**Etapa: categoria (PNEW-03)**

- **FR-012**: A etapa MUST mostrar nome e descrição de cada categoria ativa recebida da API, na ordem recebida, e exigir
  uma escolha para avançar.
- **FR-013**: A etapa MUST ter estados de carregamento, de erro (com opção de tentar de novo) e de lista vazia.

**Etapa: relato (PNEW-04)**

- **FR-014**: A etapa MUST coletar os campos do relato: descrição (obrigatória), quando aconteceu, onde, sistemas
  afetados, tipos de dados, como soube e evidências (os demais opcionais).
- **FR-015**: A descrição MUST ter de 100 a 10.000 caracteres, com contador visível e anunciado; os demais textos MUST
  ter até 2.000 caracteres. Os limites são os mesmos da API (REP-02).
- **FR-016**: "Quando aconteceu" MUST aceitar uma data exata ou só mês e ano, e não pode aceitar data futura.
- **FR-017**: Tipos de dados MUST ser uma seleção múltipla com: dados pessoais, financeiros, credenciais e outros.
- **FR-018**: A etapa MUST orientar a pessoa a descrever fatos e a não incluir dados que a identifiquem, se quiser
  ficar anônima.
- **FR-019**: Mensagens de validação MUST ficar ligadas ao campo e ser anunciadas a leitores de tela, usando o padrão de
  erro de formulário da base transversal (FTRV-07).
- **FR-020**: Os campos de texto livre MUST desligar preenchimento automático e sugestões do navegador.

**Etapa: envolvidos (PNEW-05)**

- **FR-021**: A etapa MUST ser opcional e permitir até 20 envolvidos, cada um com nome e função opcionais.
- **FR-022**: Adicionar e remover envolvidos MUST funcionar por teclado, com o foco indo para a linha nova ao
  adicionar. Ao remover, o foco MUST ir para o primeiro campo da linha seguinte; sem ela, para o da linha anterior;
  sem nenhuma linha, para o botão "Adicionar envolvido".

**Revisão e envio (PNEW-06)**

- **FR-023**: A revisão MUST mostrar tudo o que será enviado, com um link para editar cada etapa.
- **FR-024**: A revisão MUST ter um link para o aviso de privacidade antes do botão de enviar, que possa ser aberto e
  fechado sem perder o rascunho.
- **FR-025**: O botão de enviar MUST ficar desabilitado durante o envio, impedindo envio duplicado.
- **FR-026**: Com sucesso, o portal MUST guardar protocolo, chave e data de recebimento só em memória, apagar o rascunho
  e abrir a tela do protocolo.
- **FR-027**: Com erro, o rascunho MUST continuar intacto, e a mensagem MUST seguir o padrão de erros da base
  transversal (FTRV-02), sem repetir o texto enviado.
- **FR-028**: O corpo enviado MUST conter só os campos previstos para o envio (tipo de denunciante, código da categoria
  e os campos do relato), sem nenhum dado de identificação (PNEW-08 fora do escopo).

**Tela do protocolo (PACC-01)**

- **FR-029**: A tela MUST mostrar protocolo, chave e data de recebimento (só o dia) uma única vez, a partir da memória.
- **FR-030**: Recarregar a tela ou abri-la sem um envio recente MUST mostrar só o aviso de que protocolo e chave não
  podem mais ser exibidos.
- **FR-031**: A tela MUST ter botões para copiar o protocolo e a chave, com retorno visual e anunciado, e para baixar um
  arquivo de texto gerado no próprio navegador, sem chamada ao servidor.
- **FR-032**: A tela MUST avisar de forma clara que não existe recuperação da chave.
- **FR-033**: Sair pelo botão MUST exigir a confirmação "Guardei o protocolo e a chave"; sair por outro caminho (voltar
  do navegador, outro link) MUST pedir confirmação.
- **FR-034**: Ao sair da tela, protocolo e chave MUST ser apagados da memória.
- **FR-035**: Protocolo e chave MUST nunca aparecer no nome do arquivo baixado (URL, título e console já estão cobertos
  pelo FR-001).

**Página inicial (PINF-01)**

- **FR-036**: A página inicial MUST explicar o que pode ser relatado e quem pode relatar.
- **FR-037**: A página inicial MUST explicar as garantias (sem cadastro, sem registro de IP, relato cifrado, identidade
  opcional e lacrada) e recomendar dispositivo e rede pessoais para mais anonimato.
- **FR-038**: A página inicial MUST ter os caminhos "Fazer uma denúncia" e "Consultar uma denúncia".

**Integração com a API e testes**

- **FR-039**: Enquanto a API não publicar os endpoints de categorias e de envio (CAT-01, REP-02), a feature MUST ser
  construída e testada contra respostas simuladas que seguem os formatos descritos no backlog da API. As respostas
  simuladas MUST existir só nos testes e no ambiente de desenvolvimento, nunca no build de produção.
- **FR-040**: Quando os endpoints saírem no contrato da API, a feature MUST passar a usar o cliente gerado do contrato,
  e as respostas simuladas MUST ser conferidas contra ele (tarefa bloqueada até CAT-01 e REP-02).
- **FR-041**: O fluxo completo (início, wizard, revisão, protocolo) MUST ter teste de ponta a ponta com as guardas de
  privacidade da base transversal (nenhuma requisição externa, nada na URL, no armazenamento ou no console, nenhuma
  violação da política de segurança de conteúdo), nos dois navegadores usados pelo projeto.
  > Nota (2026-11-28): o e2e roda por enquanto só no Chromium; o Firefox está desativado temporariamente
  > (`docs/validacoes/navegadores-e2e.md`).
- **FR-042**: Todas as telas desta feature MUST passar na verificação automática de acessibilidade, inclusive com zoom
  de 200% e largura de 320 px.

### Privacy & Security _(mandatory)_

- **Sensitive data on screen**: o relato inteiro (descrição, onde, sistemas afetados, tipos de dados, como soube,
  evidências) e os envolvidos são digitados pela pessoa, porque são o objeto da apuração. Protocolo e chave aparecem
  uma única vez na tela do protocolo, porque são a única forma de acompanhar a denúncia (D05, D06). O tipo de
  denunciante e a categoria não identificam a pessoa e servem para triagem e estatística.
- **Storage and URL**: o rascunho, o protocolo e a chave ficam só em memória. Nada vai para a URL (que leva só o nome da
  etapa), para armazenamento local, armazenamento de sessão, banco local do navegador, cookies do portal, título da
  página ou console. O arquivo baixado é gerado no navegador e não leva protocolo nem chave no nome. O descarte acontece
  ao enviar (rascunho), ao sair da tela do protocolo (protocolo e chave), ao sair do wizard com confirmação e ao
  recarregar ou fechar a aba. Os testes de ponta a ponta verificam tudo isso com as guardas da base transversal.
- **External requests**: nenhuma. A feature só fala com a API pela rota `/api` do próprio portal, sem cookies
  (D38, D39). Nenhum asset novo é carregado de fora; qualquer ícone ou imagem vai no bundle. A cópia e o download usam
  só recursos do navegador.
- **Permissions**: as rotas usadas são públicas e anônimas por construção na API (categorias e envio de denúncia). O
  portal não envia credencial nenhuma nessas chamadas. A validação no navegador (tamanhos, campos obrigatórios) é
  conveniência: a API valida de novo e é a autoridade (constituição, princípio III).
- **Accessibility**: indicador de progresso anunciado; foco no título ao trocar de etapa; erros ligados ao campo e
  anunciados; contador da descrição anunciado sem interromper a digitação; adicionar e remover envolvidos por teclado
  com foco previsível; retorno de cópia anunciado; aviso de saída e confirmação acessíveis por teclado; todas as telas
  com zoom de 200% e largura de 320 px sem perda de conteúdo (WCAG 2.1 AA).

### Key Entities _(include if feature involves data)_

- **Rascunho da denúncia**: o que a pessoa preencheu até o momento: tipo de denunciante, categoria escolhida, campos do
  relato e lista de envolvidos. Vive só em memória, do início do wizard até o envio, a saída confirmada ou o fechamento
  da aba.
- **Categoria**: opção de classificação recebida da API, com código, nome e descrição, só as ativas e na ordem
  definida pela API.
- **Comprovante de envio (Receipt)**: protocolo, chave e data de recebimento devolvidos pela API no envio. Vive só em memória,
  até a pessoa sair da tela do protocolo.
- **Envolvido**: pessoa citada no relato, com nome e função opcionais; até 20 por denúncia.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Uma pessoa consegue enviar uma denúncia com descrição mínima, do início até a tela do protocolo, em menos
  de 5 minutos, sem ajuda.
- **SC-002**: Em 100% dos testes de ponta a ponta do fluxo, nos dois navegadores, nenhum trecho do relato, protocolo ou
  chave aparece na URL, no título, no console, no armazenamento do navegador ou em requisição para fora do portal.
  > Nota (2026-11-28): o e2e roda por enquanto só no Chromium; o Firefox está desativado temporariamente
  > (`docs/validacoes/navegadores-e2e.md`).
- **SC-003**: Em 100% das falhas de envio simuladas (sem conexão, erro do servidor, validação recusada), o rascunho
  continua idêntico ao que a pessoa preencheu.
- **SC-004**: Um clique duplo ou repetido no botão de enviar gera exatamente um envio.
- **SC-005**: Depois de sair da tela do protocolo ou recarregá-la, nenhuma ação na página consegue exibir de novo o
  protocolo ou a chave.
- **SC-006**: Todas as telas desta feature passam na verificação automática de acessibilidade, sem violações, inclusive
  com zoom de 200% e largura de 320 px.
- **SC-007**: O fluxo inteiro pode ser concluído só com o teclado.

## Assumptions

- **API ainda não disponível (opção A)**: os endpoints `GET /api/public/v1/categories` (CAT-01) e
  `POST /api/public/v1/reports` (REP-01, REP-02) ainda não existem no contrato da API. Os formatos usados nas respostas
  simuladas vêm do backlog da API: categorias com código, nome e descrição; envio com tipo de denunciante, código da
  categoria e campos do relato; resposta de sucesso com protocolo, chave e data de recebimento (só o dia). A integração
  real com o cliente gerado é uma tarefa bloqueada até esses endpoints saírem.
- **O que a base transversal já entrega e esta feature reaproveita**: a política de credenciais do portal (sem cookies),
  o tratamento padronizado de erros e as mensagens por situação, o estado sensível de tela com descarte ao sair, o
  componente de erro de formulário acessível, o cabeçalho de página com foco no título, as guardas de privacidade dos
  testes de ponta a ponta e o cliente gerado do contrato da API (feature 001).
- **Pendências da base transversal que fecham aqui**: formulários tipados e o foco no título ao trocar de etapa.
- **Formato da chave**: a API define como a chave é exibida (em grupos, para facilitar anotar, conforme REP-01). O
  portal a mostra exatamente como recebe, sem reformatar.
- **Data de recebimento**: chega da API já sem hora e é exibida só com o dia, como todas as datas do portal.
- **Aviso de privacidade**: a página `/privacidade` já existe. Esta feature só garante que ela pode ser consultada a
  partir da revisão sem perder o rascunho.
- **Fora do escopo**: anexos (PNEW-07), identificação opcional (PNEW-08), acompanhamento da denúncia e mensagens
  (features seguintes), proteção contra spam e abuso e login de denunciante (fora do escopo do projeto).
- **Códigos dos tipos de dados**: `PERSONAL`, `FINANCIAL`, `CREDENTIALS` e `OTHER`. A lista foi levada ao backlog da API
  como critério do REP-02 (decisão do usuário em 2026-11-28) e continua provisória até o endpoint sair no contrato; a
  conferência fica na tarefa de integração.
- **Respostas simuladas fora de produção**: o build de produção sempre chama a API real. Até os endpoints existirem,
  um envio feito num ambiente real recebe o erro padrão de "não encontrado" da base transversal.
