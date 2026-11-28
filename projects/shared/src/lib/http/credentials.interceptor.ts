import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ReporterSession } from '../session/reporter-session';
import { apiPath } from './api.interceptor';
import { API_POLICY } from './api-policy';

/**
 * Aplica a política de credenciais do app às chamadas `api:` (FTRV-03).
 * - Portal: `credentials: 'omit'`, para nunca enviar cookies, nem para a API no mesmo domínio. O token do
 *   denunciante vai em `Authorization: Bearer` só nas rotas de `bearerFor` (`/public/v1/me/`).
 * - Backoffice: `withCredentials`, para enviar o cookie HttpOnly da sessão da equipe.
 * Roda antes do `apiInterceptor`, enquanto a URL ainda tem o prefixo `api:`.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const path = apiPath(req.url);
  if (path === null) {
    return next(req);
  }
  const policy = inject(API_POLICY);

  if (policy.withCredentials) {
    return next(req.clone({ withCredentials: true }));
  }

  const token =
    policy.bearerFor && path.startsWith(policy.bearerFor) ? inject(ReporterSession).token() : null;
  return next(
    req.clone({
      withCredentials: false,
      credentials: 'omit',
      setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  );
};
