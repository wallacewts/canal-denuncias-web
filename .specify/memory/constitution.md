<!--
Sync Impact Report
- Versão: template → 1.0.0 (primeira ratificação)
- Princípios definidos:
  I. Anonimato do denunciante (inegociável)
  II. Segurança do navegador
  III. O front não é fronteira de segurança
  IV. Acessibilidade e clareza
  V. Padrões Angular
  VI. Testes
  VII. Qualidade e entrega
  VIII. Simplicidade
- Seções adicionadas: Restrições técnicas, Fluxo de desenvolvimento, Governança
- Seções removidas: nenhuma
- Templates:
  ✅ .specify/templates/plan-template.md (Constitution Check com os portões I a VIII)
  ✅ .specify/templates/tasks-template.md (testes obrigatórios para regras de privacidade e segurança)
  ✅ .specify/templates/spec-template.md (seção obrigatória de privacidade e segurança)
  ✅ .specify/templates/checklist-template.md (sem referência a princípios; nada a mudar)
- TODOs adiados: nenhum
-->

# Constituição do Front do Canal de Denúncias

Workspace Angular com o app `portal` (público, usado pelo denunciante anônimo), o app `backoffice` (equipe
interna) e a lib `shared`. O sistema precisa ser um exemplo de conformidade com a LGPD. As decisões de
arquitetura estão no registro de decisões da API (`canal-denuncias-api/docs/adr/README.md`, D01 a D26) e o
backlog em `docs/tarefas/`.

## Core Principles

### I. Anonimato do denunciante (inegociável)

- O portal NÃO DEVE fazer nenhuma requisição externa: nada de analytics, CDN, fontes, mapas, captcha ou scripts de
  terceiros. Fontes e assets DEVEM ir no bundle.
- Protocolo, chave e conteúdo da denúncia NÃO DEVEM ir na URL, em `localStorage`, `sessionStorage`, cookies do
  portal, console ou logs. O token de acompanhamento DEVE ficar só em memória.
- A chave do denunciante DEVE aparecer uma única vez, com opção de copiar e baixar em `.txt` e um aviso claro de
  que não há recuperação.
- Para o denunciante, a equipe DEVE aparecer só como "Equipe de apuração".

**Justificativa:** qualquer requisição a terceiros ou dado deixado no navegador pode identificar quem denunciou,
inclusive em computadores compartilhados.

### II. Segurança do navegador

- A CSP com nonce e Trusted Types NÃO DEVE ser enfraquecida. É proibido usar `unsafe-inline` ou `unsafe-eval`, ou
  liberar domínios externos, para contornar um erro.
- Bypass de sanitização do Angular (`bypassSecurityTrust*`) só DEVE ser usado com justificativa registrada no
  código e no plano.
- A sessão do backoffice DEVE ficar só em cookie `HttpOnly`/`Secure`/`SameSite=Strict`, com XSRF. Nenhum token
  DEVE ficar acessível ao JavaScript.
- Os cabeçalhos de segurança do nginx (HSTS, `X-Frame-Options`, `Referrer-Policy: no-referrer`, `nosniff`) são
  obrigatórios.

**Justificativa:** a CSP é a segunda camada contra XSS. Se algo falhar no código, o navegador ainda bloqueia o
ataque e impede que o relato digitado seja enviado para fora.

### III. O front não é fronteira de segurança

- Guards e telas escondidas melhoram a experiência, mas toda permissão DEVE ser garantida pela API. O front NÃO
  DEVE decidir sozinho o que alguém pode ver.
- O front NÃO DEVE reproduzir regras de negócio da API (transições de status, permissões). Quando precisar delas,
  DEVE consumir o que a API informa.

**Justificativa:** todo código do front pode ser alterado por quem usa o navegador. Regras copiadas divergem da
API com o tempo.

### IV. Acessibilidade e clareza

- O portal DEVE atender a WCAG 2.1 AA: navegação por teclado, foco visível, rótulos, contraste e mensagens de erro
  anunciadas. Toda tela do portal DEVE ter teste automatizado de acessibilidade.
- Textos em português simples. Erros DEVEM explicar o que aconteceu e como resolver. Em cada etapa, o denunciante
  DEVE saber o que é guardado e por quê.

**Justificativa:** qualquer pessoa precisa conseguir denunciar, e a confiança no canal depende de entender o que
acontece com os próprios dados.

### V. Padrões Angular

- Versão atual do Angular: standalone, signals, zoneless, control flow novo, lazy loading em toda rota, Reactive
  Forms tipados e Angular Material.
- O código compartilhado DEVE ficar na lib `shared`. O portal NÃO DEVE importar código do backoffice.
- O cliente da API DEVE ser gerado do OpenAPI da API, nunca escrito à mão.
- A URL base DEVE vir do `config.json` carregado em tempo de execução, para que a mesma imagem sirva todos os
  ambientes.

**Justificativa:** padrões únicos reduzem decisões repetidas, e o bundle público não carrega código interno.

### VI. Testes

- Toda regra de privacidade DEVE ter teste que falha se for quebrada (ex.: nenhum dado sensível em storage ou URL;
  nenhuma requisição para fora da origem).
- Componentes e serviços com lógica DEVEM ter testes unitários.
- Os fluxos do MVP DEVEM ter testes e2e: enviar denúncia, consultar e acompanhar, login com MFA e tratar denúncia.

**Justificativa:** regressões de privacidade no front não geram erro visível. Só o teste mostra.

### VII. Qualidade e entrega

- Commits DEVEM seguir Conventional Commits. Lint (angular-eslint), formatação, testes e build dos dois apps DEVEM
  passar antes do commit. O CI NÃO DEVE ficar vermelho.
- O bundle inicial do portal NÃO DEVE crescer sem justificativa no plano.
- A imagem nginx DEVE rodar sem root e sem vulnerabilidade HIGH/CRITICAL corrigível. Nenhum segredo DEVE entrar no
  repositório.
- Código em inglês. Textos de interface, documentação e commits em português.

**Justificativa:** o portal precisa carregar rápido em qualquer conexão e continuar auditável.

### VIII. Simplicidade

- Implementar só o que a tarefa pede. Spam/abuso e login de denunciante estão fora do escopo até nova decisão.
- Uma nova dependência só DEVE entrar se fizer trabalho substancial, e nunca uma que faça requisições externas.

**Justificativa:** cada dependência é código de terceiros rodando na página do denunciante.

## Restrições técnicas

- Angular 22 com Angular Material e fontes empacotadas via `@fontsource`.
- Dois apps com build e imagem separados: portal (público) e backoffice (pode ficar restrito à rede interna).
- Servidos por `nginx-unprivileged`, com CSP por requisição (nonce) e Trusted Types.
- A API fica atrás do mesmo domínio em `/api` nos ambientes reais, para que cookies e XSRF funcionem.
- O backoffice segue as regras de sessão da API: expira após 15 min sem uso e 8 h no máximo.

## Fluxo de desenvolvimento

- Cada funcionalidade parte de uma tarefa de `docs/tarefas/` e passa por spec, plano e tarefas do Spec Kit. As
  tarefas que dependem da API citam o ID da tarefa do backend.
- O plano DEVE conter a checagem "Constitution Check" contra os princípios I a VIII. Uma violação só é aceita se
  justificada na tabela "Complexity Tracking".
- Toda mudança passa por pull request com o CI verde: lint, testes, build, checagem de domínios externos, Trivy e
  gitleaks.
- Na revisão, mudanças em CSP, nginx, armazenamento no navegador, rotas do portal ou dependências DEVEM ser
  conferidas contra os princípios I e II.

## Governance

- Esta constituição prevalece sobre specs, planos, tarefas e práticas informais.
- Mudar um princípio exige registrar a decisão no registro de decisões (`canal-denuncias-api/docs/adr/README.md`),
  com motivo e data, e atualizar esta constituição na mesma mudança.
- Versionamento semântico: MAJOR para remover ou redefinir um princípio, MINOR para acrescentar princípio ou
  ampliar uma regra, PATCH para ajustes de redação.
- Orientações do dia a dia ficam em `AGENTS.md` e `README.md`, que não podem contradizer esta constituição.

**Version**: 1.0.0 | **Ratified**: 2026-11-27 | **Last Amended**: 2026-11-27
