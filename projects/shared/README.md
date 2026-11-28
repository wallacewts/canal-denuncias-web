# @canal/shared

Lib compartilhada pelo portal e pelo backoffice. É consumida direto do código-fonte (paths no `tsconfig.json`), sem
build próprio.

## HTTP

```ts
// app.config.ts de cada app
provideApi(config, PORTAL_API_POLICY), // ou BACKOFFICE_API_POLICY
provideAppErrorHandler(),
provideLocale(),
```

- Chame a API com o prefixo `api:` (`http.get('api:/public/v1/...')`).
- A política do app decide as credenciais: o portal nunca envia cookies e só manda o token do denunciante em
  `/public/v1/me/*`; o backoffice envia o cookie da sessão.
- Erros viram avisos em português (`contracts/error-messages.md`). Nada vai para o console.
- O token do denunciante fica em `ReporterSession`, só em memória.

## Tema

Nos `styles.scss` dos apps:

```scss
@use '@angular/material' as mat;
@use '../../shared/src/lib/theme/theme' as canal;

@include canal.app-theme(mat.$azure-palette);
```

O tema aplica os tokens do Material 3, o foco visível (`--canal-focus-ring`) e a largura de leitura
(`--canal-content-max-width`).

## Componentes, diretivas e pipes

| Item                      | Uso                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `<lib-page-header>`       | Título `h1` da página. `focus()` move o foco para o título (ex.: troca de etapa).  |
| `<lib-empty-state>`       | Estado vazio, sempre com texto.                                                    |
| `<lib-loading-state>`     | Carregamento com `role="status"`, `aria-busy` e rótulo em texto.                   |
| `ConfirmDialog.open(...)` | Confirmação do app (nunca `window.confirm`). Devolve `Observable<boolean>`.        |
| `<lib-status-chip>`       | Status com texto e cor (`tone`: neutral, info, success, warning, danger).          |
| `<lib-form-field-error>`  | Mensagem de erro com `aria-live`, ligada ao campo pela diretiva `[libFieldError]`. |
| `appSensitiveInput`       | Desliga preenchimento automático e correção ortográfica em campos sensíveis.       |
| `portalDate`              | Data sem hora, para o denunciante (`dd/MM/yyyy`).                                  |
| `staffDateTime`           | Data e hora exatas, para a equipe (`dd/MM/yyyy HH:mm:ss`).                         |
| `NotificationService`     | Avisos de erro e sucesso, anunciados ao leitor de tela.                            |

Exemplo de campo com erro acessível:

```html
<label for="relato">Relato</label>
<textarea
  id="relato"
  appSensitiveInput
  [spellcheckAllowed]="true"
  [formControl]="relato"
  [libFieldError]="erro"
></textarea>
<lib-form-field-error
  #erro
  [control]="relato"
  [messages]="{ required: 'Descreva o que aconteceu.' }"
/>
```

## Testes

`ng test shared --watch=false` (Vitest).
