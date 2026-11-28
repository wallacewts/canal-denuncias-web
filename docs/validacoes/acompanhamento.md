# Validação: acompanhamento da denúncia (feature 003)

Data: 2026-11-28. Ambiente: e2e no container oficial do Playwright 1.65.1 (Chromium e Firefox), build de produção com
nginx, CSP com nonce e Trusted Types, contra o servidor simulado (`tools/mock-api`).

## Restauração pelo cache de navegação (analyze U1)

O portal encerra o acesso quando a página volta do cache de navegação do navegador (`pageshow` com `persisted`),
para que a denúncia não reapareça depois de a pessoa sair do site e voltar (research R5). Esse caminho só tem teste
unitário (`reporter-access.spec.ts`): no e2e não é possível reproduzir de forma confiável a restauração pelo cache
(o `index.html` sai com `Cache-Control: no-store`, que na maioria dos navegadores já impede o cache). O voltar dentro
do próprio app é coberto pelo e2e (`tracking-session.spec.ts`: sair e voltar continua na consulta, sem dados).

## Firefox derruba a página no axe da consulta (corrigido)

- **Sintoma**: `Page crashed` no Firefox, no teste de acessibilidade de `/consultar` (1 em 8 execuções com o formulário
  vazio; 8 em 8 com o formulário preenchido).
- **Isolamento**: com o campo de senha preenchido, as regras do axe que calculam nome acessível (por exemplo
  `aria-allowed-attr`, `label-content-name-mismatch`) derrubam a página quando chegam a uma `<section>` com
  `aria-labelledby` apontando para o `h2`. Sem o `aria-labelledby` (ou sem o `h2`), não há queda; o texto da seção
  não importa. A tela de acompanhamento, que não tem campo de senha, não é afetada.
- **Correção**: a seção de orientações da consulta não usa `aria-labelledby`; o `h2` continua dando a estrutura de
  títulos. Depois da correção: 128 de 128 execuções dos testes da consulta no Firefox passaram.
- **Acompanhar**: se aparecer `Page crashed` em outra tela com campo de senha, conferir seções rotuladas por
  `aria-labelledby`.
