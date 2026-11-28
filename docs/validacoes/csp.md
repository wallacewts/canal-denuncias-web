# Validação da CSP e de Trusted Types em navegador real (FTRV-05)

## 2026-11-27 · Automática (e2e)

- **Ambiente:** imagens nginx dos dois apps, construídas pelo `docker-compose.e2e.yml`, com a CSP de produção (nonce
  por requisição, `require-trusted-types-for 'script'`, `default-src 'none'`).
- **Navegadores:** Chromium 159.0.8154.6 e Firefox 159.0 (imagem `mcr.microsoft.com/playwright:v1.65.1-noble`), sem
  extensões e sem `bypassCSP`.
- **Escopo:** as 13 rotas do portal e as 10 rotas do backoffice que existem hoje (placeholders), com a fixture
  `privacyGuards` (violação de CSP e Trusted Types, requisição externa, armazenamento, console).
- **Resultado:** 46 testes de rota passando (23 por navegador), com zero violações de CSP ou de Trusted Types.

Observação: no e2e, o Chromium trata as origens de teste (`http://portal:8080`, `http://backoffice:8080`) como seguras,
para aplicar os cabeçalhos que exigem HTTPS (como o `Cross-Origin-Opener-Policy`), como em produção. A CSP não muda.

## Pendente

- **Componentes que injetam estilo ou DOM** (diálogo, aviso, menu, tooltip, datepicker, select): ainda não aparecem em
  nenhuma rota. Entram na validação quando as telas os usarem (snackbar na US2, diálogo de confirmação na US3).
- **Conferência manual** em janela anônima do Chrome e do Firefox de desktop, pela equipe, com o ambiente local
  (`docker compose up -d`).
