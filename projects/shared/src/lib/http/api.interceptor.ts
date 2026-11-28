import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';

/** Prefixo que marca uma chamada à API do canal: `http.get('api:/public/v1/...')`. */
export const API_PREFIX = 'api:';

/**
 * Caminho canônico de uma chamada `api:`, relativo ao `apiBaseUrl` (ex.: `/public/v1/categories`), ou `null` se a URL
 * não for uma chamada à API. Aceita as duas formas: escrita à mão (`api:/public/v1/...`) e do cliente gerado, cujos
 * caminhos já trazem o prefixo global da API (`api:/api/public/v1/...`).
 */
export function apiPath(url: string): string | null {
  if (!url.startsWith(API_PREFIX)) return null;
  const path = '/' + url.slice(API_PREFIX.length).replace(/^\/+/, '');
  if (path === '/api') return '/';
  return path.startsWith('/api/') ? path.slice('/api'.length) : path;
}

/**
 * Troca o prefixo `api:` pela URL base de /config.json.
 * As credenciais (cookie da equipe ou token do denunciante) são decididas pelo `credentialsInterceptor`.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const path = apiPath(req.url);
  if (path === null) {
    return next(req);
  }
  const { apiBaseUrl } = inject(APP_CONFIG);
  return next(req.clone({ url: `${apiBaseUrl}${path}` }));
};
