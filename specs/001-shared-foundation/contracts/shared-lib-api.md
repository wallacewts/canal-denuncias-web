# Contrato: API pública da lib `@canal/shared`

O que os apps `portal` e `backoffice` podem importar de `@canal/shared` ao fim desta feature. Os nomes são o contrato;
a implementação fica para as tarefas.

## Configuração e HTTP

| Export                                    | Uso                                                                                                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loadAppConfig(url?)`                     | Já existe. Lê `/config.json` antes do bootstrap (ver [config-and-proxy.md](./config-and-proxy.md)).                                                                   |
| `provideApi(config, policy)`              | Registra `HttpClient` com `withFetch`, XSRF e os interceptors `api`, `credentials` e `error`. `policy` é um `ApiPolicy` ([data-model.md](../data-model.md)).          |
| `API_PREFIX` (`'api:'`)                   | Já existe. Prefixo das chamadas, trocado por `apiBaseUrl`.                                                                                                            |
| `ProvisionalApiError`, `toApiError(body)` | Tipo interno provisório e validação em tempo de execução do corpo de erro (TRV-01). O tipo é trocado pelo modelo gerado de `openapi/public.json` na T070 (⛔ TRV-11). |
| `NotificationService`                     | `error(notice)`, `success(text)`. Exibe avisos e anuncia aos leitores de tela.                                                                                        |
| `provideAppErrorHandler()`                | `ErrorHandler` que não escreve objetos de erro no console.                                                                                                            |

## Cliente gerado

| Caminho de import          | Quem pode importar | Conteúdo                                                  |
| -------------------------- | ------------------ | --------------------------------------------------------- |
| `@canal/shared/api/public` | portal, backoffice | Gerado de `openapi/public.json` (rotas `/api/public/v1`). |
| `@canal/shared/api/admin`  | **só backoffice**  | Gerado de `openapi/admin.json` (rotas `/api/admin/v1`).   |

- Uma regra de lint reprova `@canal/shared/api/admin` dentro de `projects/portal/`.
- Os arquivos gerados nunca são editados à mão.

## Sincronização dos contratos

| Script                             | Faz                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm run api:sync`                 | Copia `public.json` e `admin.json` de `../canal-denuncias-api/openapi/` para `openapi/`. |
| `npm run api:sync -- --from <dir>` | Mesma cópia a partir de outro diretório (ex.: artefato baixado do CI da API).            |
| `npm run api:generate`             | Regera os dois clientes a partir de `openapi/`, sem rede.                                |
| `npm run api:check`                | Regera e falha se houver diferença (usado no CI).                                        |

- `api:sync` falha se um dos dois arquivos não existir ou não for JSON válido.

## Sessão do denunciante (portal)

| Export            | Uso                                                                     |
| ----------------- | ----------------------------------------------------------------------- |
| `ReporterSession` | `token` (signal somente leitura), `start(token, expiresAt)`, `clear()`. |

## Componentes e pipes (`projects/shared/src/lib/ui/`)

| Export            | Entradas principais                                                           | Regra                                                                               |
| ----------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `PageHeader`      | `title`, `subtitle?`                                                          | `h1` da página; recebe foco quando pedido (wizard).                                 |
| `EmptyState`      | `title`, `description?`                                                       | Texto, nunca só ícone.                                                              |
| `LoadingState`    | `label`                                                                       | `aria-busy` e texto para leitor de tela.                                            |
| `ConfirmDialog`   | `open({ title, message, confirmLabel, cancelLabel })` → `Observable<boolean>` | Substitui `window.confirm`.                                                         |
| `StatusChip`      | `label`, `tone` (`neutral`, `info`, `success`, `warning`, `danger`)           | Sempre com texto visível.                                                           |
| `portalDate`      | `Date \| string`                                                              | `dd/MM/yyyy`, sem hora.                                                             |
| `staffDateTime`   | `Date \| string`                                                              | `dd/MM/yyyy HH:mm:ss` (D25).                                                        |
| `FormFieldError`  | componente + diretiva que liga o campo à mensagem                             | Mensagem ligada por `aria-describedby` e anunciada por região `aria-live="polite"`. |
| `SensitiveInput`  | diretiva `appSensitiveInput`                                                  | Aplica `autocomplete="off"` e `spellcheck="false"`.                                 |
| `PagePlaceholder` | `title`, `description`                                                        | Já existe. Sai à medida que as telas ficam prontas.                                 |
