# Contrato: guardas de privacidade dos testes e2e (FTRV-05, 06, 07, 11)

Toda suíte e2e usa a fixture comum `privacyGuards`. Um teste que não a usa é reprovado na revisão.

| Guarda        | Reprova quando                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| Rede          | Qualquer requisição para origem diferente da origem do app sob teste.                                           |
| URL           | Alguma URL visitada contém um valor sensível registrado no teste (protocolo, chave, trecho do relato).          |
| CSP           | Algum evento `securitypolicyviolation`, ou mensagem de console com "Content Security Policy" ou "Trusted Type". |
| Armazenamento | Ao fim do teste, `localStorage`, `sessionStorage` ou `indexedDB.databases()` não estão vazios.                  |
| Console       | Qualquer `console.error` vindo do código do app.                                                                |

Execução:

- Navegadores: Chromium e Firefox (projetos do Playwright).
- Contexto: **sem** `bypassCSP` e sem extensões.
- Acessibilidade: `@axe-core/playwright` em todas as rotas do portal, reprovando `serious` e `critical`. Se o axe
  conflitar com Trusted Types, ele roda num projeto separado (ver [research.md](../research.md), R3).
- Valores sensíveis de teste são fictícios e registrados com `privacyGuards.trackSensitive(valor)`.
