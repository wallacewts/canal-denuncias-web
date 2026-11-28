import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { ReporterSession } from '@canal/shared';

/** `/acompanhamento` só abre com a credencial em memória; sem ela, volta para a consulta (troca a entrada do histórico). */
export const reporterAccessGuard: CanActivateFn = () =>
  inject(ReporterSession).token() !== null ? true : inject(Router).createUrlTree(['/consultar']);
