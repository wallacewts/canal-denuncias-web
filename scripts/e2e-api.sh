#!/bin/sh
# e2e do backoffice contra a API real (T048 da feature 004). Pré-requisitos: npm ci e a API rodando no host na porta 3000
# (no repositório canal-denuncias-api: docker compose --profile app up -d). Nada é alterado na API além das sessões e,
# com uma conta de teste (E2E_API_EMAIL e E2E_API_PASSWORD), o que o próprio fluxo de entrada faz com ela.
set -u
if ! wget -qO- http://localhost:3000/api/admin/v1/me >/dev/null 2>&1 && ! curl -s -o /dev/null http://localhost:3000/api/admin/v1/me; then
  echo "API real fora do ar em http://localhost:3000 (suba com docker compose --profile app up -d no canal-denuncias-api)" >&2
  exit 2
fi
COMPOSE="docker compose -p canal-denuncias-web-e2e-api -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.e2e-api.yml"
export E2E_UID="$(id -u)" E2E_GID="$(id -g)"

$COMPOSE up --build --quiet-pull --attach e2e --abort-on-container-exit --exit-code-from e2e
status=$?
$COMPOSE down --remove-orphans >/dev/null 2>&1
exit $status
