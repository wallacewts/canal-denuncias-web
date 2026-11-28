# Bundle do portal

## Feature 002 (envio de denúncia) · 2026-11-28

Medido com `ng build portal` (produção) depois da US3.

| Item                                                                                         | Tamanho   | Comprimido (estimado) |
| -------------------------------------------------------------------------------------------- | --------- | --------------------- |
| Inicial do portal (`main` + estilos)                                                         | 413,41 kB | 102,86 kB             |
| Inicial antes da feature 002 (depois da fase 2)                                              | 367,60 kB | 91,01 kB              |
| Chunks lazy com código da feature (fluxo, telas novas, página inicial, aviso de privacidade) | 86,5 kB   | —                     |
| Inicial do backoffice                                                                        | 346,84 kB | 90,20 kB              |

- **Orçamento:** aviso em 440 kB e erro em 500 kB no `angular.json` (decisão do usuário; D52 no registro de decisões da
  API). Antes, o aviso era 400 kB.
- **Por que o inicial cresceu:** o código da feature fica todo em chunks lazy. O esbuild atribui cada arquivo de
  biblioteca a um único chunk, e partes do runtime do Angular e do Material que só as telas novas usam
  (`@angular/core`, `@angular/common`, `@angular/cdk/a11y`) vão para o `main`, que já carrega esses arquivos. Medido
  numa cópia do projeto: o `MatDialog` soma ~11 kB, o `formatDate` do `PortalDatePipe` soma ~11 kB, e o
  `ConfirmDialog` sozinho já levaria o inicial a ~402 kB. O otimizador de chunks do Angular
  (`NG_BUILD_OPTIMIZE_CHUNKS=1`) não reduziu nada.
- **Meta da research R12:** chunks do fluxo até 150 kB somados (86,5 kB, ok). A meta de inicial de +5 kB foi substituída
  pela decisão do orçamento (ver `specs/002-report-submission-wizard/plan.md`, Complexity Tracking).
