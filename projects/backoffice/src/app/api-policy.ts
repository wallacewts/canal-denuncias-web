import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { ApiPolicy } from '@canal/shared';

/** Backoffice: envia o cookie HttpOnly da sessão da equipe e nunca usa token de denunciante. */
export const BACKOFFICE_API_POLICY: ApiPolicy = {
  audience: 'backoffice',
  withCredentials: true,
  bearerFor: null,
  onUnauthenticated: () => void inject(Router).navigateByUrl('/login'),
};
