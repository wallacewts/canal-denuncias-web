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

## Cliente da API (gerado)

- `@canal/shared/api/public`: modelos e `PublicApi`, gerados de `openapi/public.json`. Portal e backoffice.
- `@canal/shared/api/admin`: modelos e `AdminApi`, gerados de `openapi/admin.json`. **Só o backoffice** (o lint
  reprova no portal).
- Os dois usam `rootUrl: 'api:'`, então passam pelos mesmos interceptors. `apiPath()` aceita tanto
  `api:/public/v1/...` quanto os caminhos do contrato, que já trazem `/api` (`api:/api/public/v1/...`).
- Atualizar: `npm run api:sync` (copia os contratos da API) e `npm run api:generate`. O CI roda `npm run api:check`.
- Nunca edite `src/lib/api/generated/`.

## Estado de tela

Estado sensível (rascunho do relato, denúncia aberta, identidade revelada) usa `ScreenState<T>`, fornecido no
componente de rota e descartado ao sair da tela:

```ts
@Injectable()
class ReportDraftState extends ScreenState<ReportDraft> {}
@Component({ providers: [ReportDraftState] /* ... */ })
class NewReportWizard {}
```

Critério para adotar `@ngrx/signals`: tela com mais de uma fonte assíncrona e regras de atualização compartilhadas por
vários componentes (provável na caixa de denúncias do backoffice).

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
