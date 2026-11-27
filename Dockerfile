# syntax=docker/dockerfile:1
# Uma imagem por app: docker build --build-arg APP=portal|backoffice .
ARG NODE_VERSION=26
ARG NGINX_VERSION=1.31-alpine

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm pkg delete scripts.prepare && npm ci

FROM deps AS build
ARG APP
ENV NG_CLI_ANALYTICS=false
COPY angular.json tsconfig.json ./
COPY projects ./projects
RUN test "$APP" = portal -o "$APP" = backoffice || (echo "Use --build-arg APP=portal ou APP=backoffice" && exit 1)
RUN npx ng build "$APP"

FROM nginxinc/nginx-unprivileged:${NGINX_VERSION} AS runtime
ARG APP
USER root
# Atualiza os pacotes do Alpine (a imagem base pode estar atrás das correções) e remove o curl, que não é usado.
RUN apk upgrade --no-cache && apk del --no-cache curl && rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx/security-headers.inc.template /etc/nginx/templates/security-headers.inc.template
COPY docker/nginx/${APP}.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/${APP}/browser /usr/share/nginx/html
USER 101
# Só variáveis APP_* são substituídas nos templates. connect-src padrão: só o próprio domínio (API em /api).
ENV NGINX_ENVSUBST_FILTER=APP_ \
    APP_CSP_CONNECT_SRC="'self'"
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
