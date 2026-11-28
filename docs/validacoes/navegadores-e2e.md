# Navegadores do e2e: Firefox desativado temporariamente

Data: 2026-11-28. Decisão do usuário, **temporária**: o e2e roda só no Chromium, local e na CI, até se decidir
voltar a testar no Firefox. O registro como decisão no `docs/adr/README.md` da API fica com o agente do backend.

## Motivo

O Firefox 159 da imagem do Playwright 1.65.1 derruba a página durante a verificação de acessibilidade (axe) em cerca
de 5% das execuções, sem causa encontrada no código do app (investigação em `docs/validacoes/acesso-equipe.md`). As
outras instabilidades do Firefox (fonte ou chunk abortado ao recarregar ou navegar) foram corrigidas nos testes.

## Como está e como reativar

- `e2e/playwright.config.ts` lê `E2E_BROWSERS` (lista separada por vírgula, padrão `chromium`). O Firefox continua
  configurado no mesmo arquivo, com a mesma imagem.
- `docker-compose.e2e.yml` repassa `E2E_BROWSERS` para o container (padrão `chromium`). A CI usa o padrão.
- Rodar com os dois, quando quiser: `E2E_BROWSERS=chromium,firefox npm run e2e`.
- Os testes e as esperas feitas para o Firefox continuam no código (`reloadWhenSettled`, `waitForFonts`, os ramos por
  `browserName` em `new-report.spec.ts` e `coop.spec.ts`).

Para reativar de vez:

1. Decidir o que fazer com a queda do Firefox no axe (repetir a medição com um Playwright/Firefox mais novo; se
   continuar, escolher entre aceitar com orientação na CI ou deixar só aquele teste fora do Firefox).
2. Rodar `E2E_BROWSERS=chromium,firefox npm run e2e` duas vezes seguidas, tudo verde.
3. Trocar o padrão para `chromium,firefox` em `e2e/playwright.config.ts` e `docker-compose.e2e.yml`, voltar o nome do
   passo na CI (`.github/workflows/ci.yml`) e as notas das specs e do README, e atualizar este arquivo.

## O que era coberto só no Firefox

| Comportamento                                                                                                                                                     | Como fica                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cópia sem `navigator.clipboard` (portal, chave do protocolo): caminho de seleção manual                                                                           | **Mantido no Chromium**: teste novo em `e2e/portal/new-report.spec.ts` remove a API antes de a página carregar. Também no unitário (`protocol-issued-page.spec.ts`)                                                                                                                   |
| Cópia sem `navigator.clipboard` (backoffice, códigos de recuperação)                                                                                              | **Mantido no unitário**: `recovery-codes-page.spec.ts` ganhou o caso sem a API (além do caso de cópia negada). Sem e2e                                                                                                                                                                |
| Escrita de outra origem detectada só pelo `Origin` (o Firefox em HTTP não envia `Sec-Fetch-Site`), com o `Host` original repassado pelo proxy                     | **Parcial**: o algoritmo sem `Sec-Fetch-Site` é testado no simulador (`auth.test.mjs`, `isCrossOriginWrite`) e no e2e por requisição só com `Origin` (`cross-origin.spec.ts`); o `Host` com a porta continua no `proxy.spec.ts`. **Lacuna**: um navegador real mandando só o `Origin` |
| Download do `.txt` (comprovante e códigos de recuperação)                                                                                                         | **Mantido no Chromium** (o download já era conferido nos dois). **Lacuna**: o tratamento do download pelo Firefox                                                                                                                                                                     |
| COOP                                                                                                                                                              | Sem mudança: já era pulado no Firefox (só aplica COOP em HTTPS; `docs/validacoes/csp.md`)                                                                                                                                                                                             |
| Motor Gecko em geral: CSP com nonce e Trusted Types, layout em 320 px e zoom de 200%, axe, foco e teclado, `BroadcastChannel` entre abas, relógio controlado, SRI | **Lacuna**: só o Chromium confere. Conferência manual no Firefox de desktop continua recomendada antes de cada entrega (roteiros dos `quickstart.md`)                                                                                                                                 |
