# Quickstart: validação do acompanhamento pelo portal

Pré-requisitos: Node 26.13.1 (`.tool-versions`), Docker, dependências instaladas (`npm ci`).

## 1. Unitários e scripts

```bash
npm test                 # normalização do protocolo, ReporterAccess (aviso, expiração, 401, sair), telas
npm run test:scripts     # simulador: novas rotas, guard simulado, 409, contadores, sem log do corpo
```

## 2. Build sem nada simulado

```bash
npm run build && npm run check:build   # reprova sentinelas DV-SIMUL, SIMULADA, __mock
```

Esperado: build verde, bundle inicial do portal até ~417 kB (aviso em 440 kB, D52).

## 3. Ponta a ponta (Chromium e Firefox, guardas de privacidade ativas)

```bash
npm run e2e
```

Cenários esperados (ver `contracts/mock-api-tracking.md`):

| Cenário                                            | Resultado esperado                                           |
| -------------------------------------------------- | ------------------------------------------------------------ |
| Protocolo `dv simul ado00` + chave válida          | Normaliza, abre o acompanhamento, foco no título             |
| Chave errada; cenário `invalid`; `rate-limited`    | Sempre "Protocolo ou chave inválidos."; campos mantidos      |
| Cada cenário de `report`                           | Rótulo, desfecho, prazo e linha do tempo conforme o contrato |
| "Responder agora"                                  | Foco no campo de mensagem                                    |
| Enviar resposta (`awaiting`)                       | Mensagem na lista, campo limpo, status vira "Em análise"     |
| Clique duplo em Consultar e em Enviar              | `stats` mostra 1 requisição                                  |
| `new-team-message` + "Atualizar"                   | Mensagem nova na lista e anunciada                           |
| `send: closed`                                     | Campo some, explicação aparece                               |
| `page.clock` até 13 min                            | Faixa de expiração anunciada                                 |
| `page.clock` até 15 min                            | Volta para a consulta com "Seu acesso terminou…"             |
| `me: unauthorized`                                 | Volta para a consulta com a mesma mensagem                   |
| Sair + voltar do navegador                         | Continua na consulta, nada da denúncia visível               |
| Recarregar `/acompanhamento`                       | Vai para a consulta                                          |
| Fluxo só com teclado; axe em 320 px e zoom de 200% | Sem violação                                                 |

Em todos: nenhum protocolo, chave, token ou texto na URL, no título, no console ou no armazenamento; nenhuma requisição
para outra origem.

## 4. Manual

- **SC-001 (analyze C2)**: alguém que não participou do desenvolvimento, com o protocolo `DV-SIMUL-ADO00` e uma chave
  começando com `SIMULADA` anotados, chega ao andamento em menos de 1 minuto, sem ajuda. Anotar o tempo em
  `docs/validacoes/acompanhamento.md`.
- Conferência opcional:

`npm run dev:mock-api` e `npm start` no portal; consultar com `DV-SIMUL-ADO00` e uma chave começando com `SIMULADA`.
Conferir que o navegador não guarda nada em armazenamento (DevTools → Application) e que sair limpa a tela.
