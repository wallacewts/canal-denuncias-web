# 05 · Backoffice: autenticação

**Objetivo:** login da equipe com senha e MFA por aplicativo autenticador, primeiro acesso, guard das rotas e
expiração da sessão. Resolve o `TODO: authGuard` deixado em `app.routes.ts`.

**Depende de (backend):** AUTH-01 a AUTH-08, USERS-07.

**Telas existentes:** `features/auth/login-page.ts` (`/login`), `layout/shell.ts`.

---

> **Feature 004 do front (2026-11-28):** critérios de BAUTH-01 a BAUTH-07 atendidos e validados contra o simulador
> (`tools/mock-api`). A conferência contra a API real fica para a integração (T046 a T049 da feature 004), quando
> AUTH-01 a AUTH-07 e USERS-07 estiverem no `openapi/admin.json`. BAUTH-08 (Produção) continua aberto.

### BAUTH-01 · Login com senha

**Estimativa:** M · **Marco:** MVP · **Depende de:** FTRV-03, AUTH-01

- **Endpoints:** `POST /api/admin/v1/auth/sign-in`.

**Critérios de aceite**

- [x] E-mail e senha. Erro sempre genérico ("E-mail ou senha inválidos"), inclusive para usuário bloqueado ou
      desativado.
- [x] Depois do login, segue para a etapa que a API indicar: desafio MFA (BAUTH-02), troca de senha obrigatória
      (BAUTH-04) ou cadastro do MFA (BAUTH-03).
- [x] Nenhum token é lido ou guardado pelo front: a sessão é o cookie `HttpOnly` da API.

### BAUTH-02 · Desafio MFA

**Estimativa:** M · **Marco:** MVP · **Depende de:** BAUTH-01, AUTH-04

- **Endpoints:** `POST /api/admin/v1/auth/mfa/challenge`.

**Critérios de aceite**

- [x] Campo de 6 dígitos com `autocomplete="one-time-code"` e teclado numérico no celular.
- [x] Opção "Usar um código de recuperação".
- [x] Erro genérico. Muitas falhas seguidas mostram a mensagem de bloqueio temporário sem dizer o motivo.

### BAUTH-03 · Primeiro acesso: cadastro do MFA

**Estimativa:** M · **Marco:** MVP · **Depende de:** BAUTH-01, AUTH-03

- **Endpoints:** `POST /api/admin/v1/auth/mfa/enrollment`, `POST /api/admin/v1/auth/mfa/enrollment/confirmation`.

**Critérios de aceite**

- [x] Mostra o QR code (data URL, permitido pela CSP em `img-src data:`) e o segredo em texto para digitação manual.
- [x] Ativa só depois de um código válido.
- [x] Mostra os 10 códigos de recuperação uma única vez, com copiar e baixar `.txt` gerado no navegador. A pessoa
      confirma que guardou antes de continuar.
- [x] Segredo e códigos são apagados da memória ao sair da tela.

### BAUTH-04 · Troca de senha obrigatória

**Estimativa:** P · **Marco:** MVP · **Depende de:** BAUTH-01, AUTH-05, USERS-02

Usuário criado pelo ADMIN recebe senha provisória e precisa trocá-la no primeiro login.

- **Endpoints:** `PUT /api/admin/v1/me/password`.

**Critérios de aceite**

- [x] Senha atual, nova e confirmação, com a política de senha exibida e validada antes do envio.
- [x] Depois da troca, segue para o cadastro do MFA quando ele ainda não existir.

### BAUTH-05 · Guard de autenticação e perfis

**Estimativa:** M · **Marco:** MVP · **Depende de:** BAUTH-01, AUTH-06, USERS-07

- **Telas e componentes:** `authGuard`, guard de permissão, serviço `CurrentUser` (signal com o resultado de `/me`), menu do
  `Shell`.
- **Endpoints:** `GET /api/admin/v1/me`.

**Critérios de aceite**

- [x] Toda rota dentro do `Shell` exige sessão válida. Sem sessão, vai para `/login` guardando só o caminho de
      retorno.
- [x] Cada rota declara a permissão que exige, e o menu mostra só o que a pessoa pode abrir, a partir das permissões
      efetivas devolvidas pela API em `GET /me` (USERS-07). O front não copia a matriz de perfis × telas (decisão de
      2026-11-28, feature 004).
- [x] A API continua sendo a autoridade: esconder no front é conveniência, e um 403 da API é tratado (FTRV-02).
- [x] Testes unitários dos guards.

### BAUTH-06 · Expiração da sessão

**Estimativa:** M · **Marco:** MVP · **Depende de:** BAUTH-05, AUTH-02

**Critérios de aceite**

- [x] Aviso um minuto antes dos 15 minutos sem uso, com opção de continuar (qualquer chamada à API renova).
- [x] Ao expirar (15 minutos sem uso ou 8 horas no total) ou receber 401, limpa da memória todos os dados de
      denúncias e volta para `/login` com uma mensagem.
- [x] Logout numa aba encerra as outras abas abertas (`BroadcastChannel`, sem usar storage).

### BAUTH-07 · Sair

**Estimativa:** P · **Marco:** MVP · **Depende de:** BAUTH-05, AUTH-02

- **Endpoints:** `POST /api/admin/v1/auth/sign-out`.

**Critérios de aceite**

- [x] Botão "Sair" no `Shell`. Limpa a memória mesmo se a chamada falhar.

### BAUTH-08 · Aviso de excesso de tentativas

**Estimativa:** P · **Marco:** Produção · **Depende de:** BAUTH-01, AUTH-08

**Critérios de aceite**

- [ ] Resposta 429 mostra quanto tempo esperar, a partir do cabeçalho `Retry-After`, e desabilita o botão até lá.
