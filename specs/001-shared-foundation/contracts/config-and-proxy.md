# Contrato: configuração em tempo de execução e proxy `/api` (FTRV-04)

## `/config.json`

```json
{ "apiBaseUrl": "/api" }
```

- Mesmo valor nos dois apps e em todos os ambientes dockerizados. Montado no container, servido com `no-store`.

## Proxy no nginx de cada app

| Item                                        | Portal                                                 | Backoffice                              |
| ------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| `location /api/`                            | `proxy_pass ${API_UPSTREAM}`                           | `proxy_pass ${API_UPSTREAM}`            |
| Log de acesso                               | desligado (`access_log off`)                           | ligado                                  |
| `X-Forwarded-For`, `X-Real-IP`, `Forwarded` | **removidos** (enviados vazios)                        | IP real repassado (auditoria da equipe) |
| Cookies                                     | o portal não envia (política `withCredentials: false`) | repassados                              |

- `API_UPSTREAM`: variável de ambiente. No compose local, `http://host.docker.internal:3000` com
  `extra_hosts: ["host.docker.internal:host-gateway"]`.
- A API continua vendo os caminhos `/api/public/v1/*` e `/api/admin/v1/*`.

## CSP

- `connect-src 'self'` fixo nos dois apps. A variável `APP_CSP_CONNECT_SRC` é removida.
- O restante da política não muda (nonce por requisição, Trusted Types, `default-src 'none'`).
