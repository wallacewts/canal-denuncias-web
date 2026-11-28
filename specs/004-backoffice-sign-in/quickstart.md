# Quickstart: validar o acesso da equipe ao backoffice

## Pré-requisitos

- Node 26 (`.tool-versions`) e Docker.
- `npm ci`.

## 1. Rodar contra o simulador

```bash
npm run dev:mock-api        # simulador com as rotas de autenticação (contas de cenário em contracts/auth-api.md)
npm run start:backoffice     # http://localhost:4300, com /api apontando para o simulador
```

## 2. Roteiros manuais

1. **Entrada:** conta `pronta` → e-mail e senha → código → painel. Repetir com senha errada, e-mail inexistente,
   conta `bloqueada` e `desativada`: a mesma mensagem em todos. **Medir (SC-001):** com o código à mão, da tela de
   login ao painel em menos de 30 segundos, sem ajuda.
1. **Senha redefinida com autenticador:** conta `troca-com-autenticador` (senha provisória) → código → troca de senha →
   painel. Recarregar na troca de senha: continua nela; abrir `/denuncias` pelo endereço: volta para a troca.
1. **Primeiro acesso:** conta `primeiro-acesso` → troca de senha (testar senha curta e senha comum) → cadastro do
   autenticador (QR code e segredo) → código inválido e depois válido → 10 códigos, copiar e baixar, "Guardei" →
   painel. Recarregar na tela dos códigos: eles não reaparecem. **Medir (SC-002):** menos de 5 minutos sem ajuda.
1. **Menu por permissão:** conta `sem-permissoes` → menu só com Painel e Meu perfil; abrir `/usuarios` pelo endereço →
   acesso negado.
1. **Expiração:** com o relógio controlado do simulador, esperar o aviso de inatividade, continuar, esperar de novo e
   deixar expirar → login com a mensagem. Repetir para o limite de 8 horas (aviso sem "Continuar").
1. **Abas:** abrir duas abas, sair numa → a outra volta ao login. Usar só uma por 14 minutos → a outra não mostra aviso.
1. **Voltar:** depois de sair, usar o voltar do navegador → nenhuma tela interna com dados.

## 3. Verificações automáticas

```bash
npm run lint && npm run lint:rules
npm test
npm run test:scripts
npm run build && npm run check:build   # sem sentinelas do simulador; regra do barril no portal
npm run api:check
npm run e2e                            # guardas de privacidade em todos os testes; Chromium e Firefox
```

Esperado: tudo verde; e2e de entrada, primeiro acesso, menu por permissão, expiração (relógio controlado), abas,
voltar e escrita de outra origem recusada pelo simulador.

## 4. Integração com a API real (tarefas bloqueadas)

Quando AUTH-01 a AUTH-07 e USERS-07 estiverem no `openapi/admin.json`: `npm run api:sync && npm run api:generate`,
trocar os tipos provisórios pelo cliente gerado e rodar os e2e contra a API (inclusive a T058 da feature 001, agora
provando a recusa por origem).
