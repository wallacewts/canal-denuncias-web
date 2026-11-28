# AGENTS.md

Front-end do Canal de Denúncias de Vazamento de Dados: workspace Angular 22 com `projects/portal` (denunciante
anônimo), `projects/backoffice` (equipe interna) e `projects/shared` (importado como `@canal/shared`). Leia o
README.md antes de mudar algo. A versão do Angular é provavelmente mais nova do que você conhece: confira o que o CLI
gera em vez de assumir APIs antigas (zoneless e componentes standalone são o padrão; testes rodam no Vitest).

## Regras que não podem ser quebradas

- Nenhuma telemetria, analytics, CDN, fonte ou script externo. Fontes e ícones entram por pacote npm e vão no bundle.
  Não ative o analytics do Angular CLI (`cli.analytics` fica `false` em angular.json).
- Nada de `localStorage`, `sessionStorage`, IndexedDB ou `document.cookie`. A sessão é cookie `HttpOnly` da API.
- Protocolo, chave e dados do relato nunca vão na URL (nem em parâmetro de rota, nem em query string).
- O portal não registra acesso: o nginx do portal fica com `access_log off`.
- A CSP é estrita (nonce por requisição + Trusted Types). Não use `innerHTML` com string crua, `bypassSecurityTrust*`,
  `eval` ou estilos/scripts inline sem nonce. Não afrouxe a CSP em `docker/nginx/security-headers.inc.template` sem
  registrar uma decisão.
- Chamadas à API usam o prefixo `api:` (`http.get('api:/public/v1/...')`), tratado por `apiInterceptor`. Prefira o cliente
  gerado (`@canal/shared/api/public` e `/admin`). Nunca edite `projects/shared/src/lib/api/generated/`: atualize com
  `npm run api:sync` (copia os contratos da API) e `npm run api:generate`. O CI roda `npm run api:check`.
- O portal nunca importa `@canal/shared/api/admin` (o lint reprova).
- Nada de `console.*` no código dos apps e da lib (regra `no-console`). Erros são tratados pelo `errorInterceptor` e pelo
  `AppErrorHandler`.
- O token do denunciante fica só em `ReporterSession` (memória). Estado sensível de tela usa `ScreenState<T>` fornecido no
  componente de rota.
- O proxy `/api` do portal remove IP e cookies; não mude isso sem registrar decisão.
- Testes de ponta a ponta: `npm run e2e` (Playwright no container oficial). Todo teste usa a fixture `privacyGuards` de
  `e2e/fixtures/privacy-guards.ts`. Nunca use `bypassCSP`.
- Textos de interface em português; nomes de código em inglês.

## Princípios

A constituição do projeto, em `.specify/memory/constitution.md`, prevalece sobre qualquer outra orientação. Todo plano do Spec Kit precisa passar pela checagem dela.
