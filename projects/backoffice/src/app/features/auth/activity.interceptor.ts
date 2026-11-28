import { HttpResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { apiPath } from '@canal/shared';
import { tap } from 'rxjs';
import { StaffSession } from './staff-session';

/** Toda resposta 2xx de uma chamada administrativa conta como uso da sessão (R3). A saída não conta. */
export const activityInterceptor: HttpInterceptorFn = (req, next) => {
  const path = apiPath(req.url);
  if (path === null || !path.startsWith('/admin/') || path.endsWith('/auth/sign-out'))
    return next(req);
  const session = inject(StaffSession);
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse && event.ok) session.markActivity();
    }),
  );
};
