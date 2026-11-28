# Data Model: Base transversal do front

**Feature**: [spec.md](./spec.md) · **Data**: 2026-11-27

O front não persiste nada. Todas as entidades abaixo existem só em memória enquanto a página está aberta.

## AppConfig

Configuração carregada de `/config.json` antes do bootstrap (já existe em `projects/shared/src/lib/config/app-config.ts`).

| Campo        | Tipo     | Regra                                                                                |
| ------------ | -------- | ------------------------------------------------------------------------------------ |
| `apiBaseUrl` | `string` | Obrigatório. Sem barra final. Em todos os ambientes dockerizados: `"/api"` (FR-014). |

- Arquivo ausente, HTTP diferente de 200 ou JSON sem `apiBaseUrl`: o app não inicia e mostra a mensagem de
  indisponibilidade, sem escrever no console (FR-008, FR-034).

## ApiPolicy

Política de credenciais de cada app, definida no código do app (não no `config.json`, para que não possa ser trocada
por configuração).

| Campo               | Tipo                      | Portal                       | Backoffice |
| ------------------- | ------------------------- | ---------------------------- | ---------- |
| `withCredentials`   | `boolean`                 | `false`                      | `true`     |
| `bearerFor`         | prefixo de rota ou `null` | `/public/v1/me/`             | `null`     |
| `onUnauthenticated` | ação de navegação         | limpar sessão → `/consultar` | `/login`   |

## ApiError

Corpo padrão de erro da API (TRV-01).

**Tipagem em duas etapas** (constituição, princípio V: formatos da API não são escritos à mão):

1. **Agora**: `toApiError(unknown)` valida o corpo em tempo de execução e devolve um tipo interno
   `ProvisionalApiError`, marcado no código como provisório. Ele descreve só o que a interface precisa ler, sem
   pretender ser o modelo da API.
2. **Depois do TRV-11**: o tipo interno é trocado pelo modelo de erro gerado de `openapi/public.json`, e o
   `ProvisionalApiError` é removido. A validação em tempo de execução continua, porque a resposta pode vir fora do
   formato.

| Campo        | Tipo                 | Regra                                                                             |
| ------------ | -------------------- | --------------------------------------------------------------------------------- |
| `statusCode` | `number`             | Código HTTP.                                                                      |
| `error`      | `string`             | Nome curto do erro.                                                               |
| `message`    | `string \| string[]` | Mensagem da API. **Não** é exibida diretamente: a tela usa a tabela de mensagens. |
| `requestId`  | `string`             | Opcional. Exibido para o suporte quando presente.                                 |

- Resposta sem corpo ou fora do formato: tratada como `ApiError` com `statusCode` da resposta (ou `0` para falha de
  rede) e sem `requestId`.
- O mapeamento de status para mensagem fica em [contracts/error-messages.md](./contracts/error-messages.md).

## UserNotice

Aviso exibido à pessoa.

| Campo        | Tipo                      | Regra                                               |
| ------------ | ------------------------- | --------------------------------------------------- |
| `text`       | `string`                  | Português, diz o que aconteceu e o que fazer.       |
| `requestId`  | `string \| null`          | Mostrado como "Código para o suporte: …".           |
| `politeness` | `'polite' \| 'assertive'` | `assertive` para erros, `polite` para confirmações. |

## ReporterSession (só portal)

Credencial de acompanhamento do denunciante (PUB-01, PUB-02).

| Campo       | Tipo             | Regra                                                               |
| ----------- | ---------------- | ------------------------------------------------------------------- |
| `token`     | `string \| null` | Só em memória (`signal`). Nunca em storage, URL, título ou console. |
| `expiresAt` | `Date \| null`   | Vem da API na consulta; usado para avisar antes de expirar.         |

**Transições**: `vazia` → (consulta com protocolo e chave aceita) → `ativa` → (401, expiração, sair do acompanhamento ou
recarregar a página) → `vazia`. O protocolo e a chave **não** são guardados na sessão.

## CursorPage&lt;T&gt;

Formato das listagens paginadas (TRV-08), consumido pelos componentes de lista das features seguintes.

| Campo        | Tipo             | Regra                              |
| ------------ | ---------------- | ---------------------------------- |
| `items`      | `T[]`            | Até `limit` itens (máximo 100).    |
| `nextCursor` | `string \| null` | `null` quando não há mais páginas. |

## Estado sensível de tela

Rascunho do relato, denúncia aberta e identidade revelada ficam em serviços com escopo da rota (`providers` do
componente de rota). Esses serviços são destruídos quando a pessoa sai da tela (FR-033). Os serviços globais com estado
sensível (`ReporterSession`) expõem `clear()`, chamado no 401 e no fim da sessão.
