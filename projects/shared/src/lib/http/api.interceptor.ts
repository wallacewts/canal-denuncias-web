import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';

/** Prefixo que marca uma chamada à API do canal: `http.get('api:/public/v1/...')`. */
export const API_PREFIX = 'api:';

/**
 * Troca o prefixo `api:` pela URL base de /config.json e envia os cookies da sessão.
 * A sessão da equipe vive em cookie HttpOnly emitido pela API: o front nunca lê nem guarda token.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_PREFIX)) {
    return next(req);
  }
  const { apiBaseUrl } = inject(APP_CONFIG);
  const path = req.url.slice(API_PREFIX.length).replace(/^\/+/, '');
  return next(req.clone({ url: `${apiBaseUrl}/${path}`, withCredentials: true }));
};
