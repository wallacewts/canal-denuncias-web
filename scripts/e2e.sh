#!/bin/sh
# Sobe os dois apps, o servidor de eco e roda o Playwright no container oficial. Sempre derruba tudo no fim.
# Pré-requisito: npm ci (o container usa o node_modules do repositório).
set -u
COMPOSE="docker compose -p canal-denuncias-web-e2e -f docker-compose.yml -f docker-compose.e2e.yml"
export E2E_UID="$(id -u)" E2E_GID="$(id -g)"

$COMPOSE up --build --quiet-pull --attach e2e --abort-on-container-exit --exit-code-from e2e
status=$?
$COMPOSE down --remove-orphans >/dev/null 2>&1
exit $status
