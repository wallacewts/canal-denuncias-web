# Contrato: rotas e telas do acesso ao backoffice

## Rotas do front

| Rota                            | Tela                             | Acesso                                           | Título (+ " \| Backoffice")       |
| ------------------------------- | -------------------------------- | ------------------------------------------------ | --------------------------------- |
| `/login`                        | E-mail e senha                   | aberta                                           | Entrar                            |
| `/login/codigo`                 | Desafio do segundo fator         | só com etapa `MFA_REQUIRED` em memória           | Código de verificação             |
| `/primeiro-acesso/senha`        | Troca de senha obrigatória       | só com etapa `PASSWORD_CHANGE_REQUIRED`          | Trocar senha                      |
| `/primeiro-acesso/autenticador` | Cadastro do segundo fator        | só com etapa `MFA_ENROLLMENT_REQUIRED`           | Cadastrar aplicativo autenticador |
| `/primeiro-acesso/codigos`      | Códigos de recuperação (uma vez) | só logo depois da confirmação do cadastro        | Códigos de recuperação            |
| Telas do `Shell`                | Painel, caixa, detalhe etc.      | `authGuard` + `permissionGuard` (`data.ability`) | (sem mudança)                     |
| `/perfil`                       | Meu perfil e troca de senha      | sessão válida (sem `ability`)                    | Meu perfil                        |

Sem a etapa certa em memória, as rotas do fluxo tentam o `/me`: a troca de senha exigida depois do segundo fator volta
por ele; sem isso, fazem `replaceUrl` para `/login`.

Respostas 403 com código, tratadas pela política do backoffice (`onForbidden`), sem a tela de acesso negado e sem
encerrar a sessão: `PASSWORD_CHANGE_REQUIRED` leva a `/primeiro-acesso/senha`; `STEP_NOT_ALLOWED` leva à etapa
certa (ou ao painel, se tudo já foi concluído). Nenhuma rota leva e-mail, código,
caminho de retorno ou qualquer dado na URL.

## Permissão exigida por tela (códigos `recurso.ação` do USERS-07; nomes exatos conferidos na integração, T047)

| Tela                | `data.ability`                                       |
| ------------------- | ---------------------------------------------------- |
| Painel              | — (sessão válida)                                    |
| Caixa de denúncias  | `reports.list`                                       |
| Detalhe da denúncia | `reports.read` (a API decide cada registro: 403/404) |
| Triagem             | `reports.triage`                                     |
| Relatórios          | `dashboard.read`                                     |
| Usuários            | `users.manage`                                       |
| Configurações       | `settings.sla`                                       |
| Trilha de auditoria | `audit.read`                                         |
| Meu perfil          | — (sessão válida)                                    |

O menu do `Shell` usa a mesma tabela. A tela de acesso negado não carrega a tela pedida.

## Mensagens (região `role="status"` da tela de login, uma por encerramento)

| Motivo            | Texto                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| `signed-out`      | Você saiu do backoffice.                                              |
| `idle`            | Sua sessão terminou por falta de uso. Entre de novo para continuar.   |
| `absolute`        | Sua sessão atingiu o limite de 8 horas. Entre de novo para continuar. |
| `unauthenticated` | Sua sessão terminou. Entre de novo para continuar.                    |
| `other-tab`       | Você saiu do backoffice em outra aba.                                 |

## Avisos de expiração (faixa `role="alert"`, não modal)

- Inatividade: "Sua sessão vai terminar em 1 minuto por falta de uso." — botões "Continuar" e "Sair".
- Limite absoluto: "Sua sessão vai terminar em 1 minuto (limite de 8 horas). Salve o que estiver fazendo." — botão
  "Sair".

## Foco e acessibilidade

- Ao trocar de etapa, foco no `h1` da tela (`PageHeader`).
- Erros de formulário com `FormFieldError` (ligado ao campo e anunciado).
- QR code com texto alternativo apontando para o segredo em texto, exibido em blocos de 4 caracteres.
