import { HttpContextToken, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../notifications/notification.service';
import { API_PREFIX } from './api.interceptor';
import { API_POLICY } from './api-policy';
import { toApiError } from './api-error';
import { errorMessageFor, withSupportCode } from './error-messages';

/**
 * Status que quem chama trata sozinho: para eles, o interceptor não mostra mensagem nem roda a ação de não
 * autenticado; só repassa o erro. Ex.: a consulta do denunciante trata 400, 401 e 429 com a mesma mensagem genérica.
 */
export const API_CALLER_HANDLES = new HttpContextToken<readonly number[]>(() => []);

/**
 * Tratamento único de erros das chamadas `api:` (FTRV-02): mostra a mensagem da tabela, com o código para o suporte
 * quando a API envia `requestId`, roda a ação de não autenticado no 401 e repassa o erro para quem chamou.
 * Nada vai para o console.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_PREFIX)) {
    return next(req);
  }
  const policy = inject(API_POLICY);
  const notifications = inject(NotificationService);
  const injector = inject(EnvironmentInjector);

  return next(req).pipe(
    catchError((response: unknown) => {
      if (response instanceof HttpErrorResponse) {
        const error = toApiError(response.status, response.error);
        if (req.context.get(API_CALLER_HANDLES).includes(error.statusCode)) {
          return throwError(() => response);
        }
        const silent = error.statusCode === 401 && policy.silentUnauthenticated === true;
        if (!silent)
          notifications.error(
            withSupportCode(errorMessageFor(error.statusCode, policy.audience), error.requestId),
            error.requestId,
          );
        if (error.statusCode === 401) {
          runInInjectionContext(injector, policy.onUnauthenticated);
        }
      }
      return throwError(() => response);
    }),
  );
};
