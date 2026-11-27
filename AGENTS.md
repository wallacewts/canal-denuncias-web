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
- Chamadas à API usam o prefixo `api:` (`http.get('api:/public/v1/...')`), tratado por `apiInterceptor`.
- Textos de interface em português; nomes de código em inglês.

## Princípios

A constituição do projeto, em `.specify/memory/constitution.md`, prevalece sobre qualquer outra orientação. Todo plano do Spec Kit precisa passar pela checagem dela.
