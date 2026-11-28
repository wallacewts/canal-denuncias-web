import { inject } from '@angular/core';
import type { ApiPolicy } from '@canal/shared';
import { StaffSession } from './features/auth/staff-session';

/**
 * Backoffice: envia o cookie HttpOnly da sessão da equipe e nunca usa token de denunciante. O 401 é silencioso: o
 * `StaffSession` encerra a sessão e a tela de login mostra o motivo (uma única mensagem, research R1).
 */
export const BACKOFFICE_API_POLICY: ApiPolicy = {
  audience: 'backoffice',
  withCredentials: true,
  bearerFor: null,
  silentUnauthenticated: true,
  onUnauthenticated: () => inject(StaffSession).end('unauthenticated'),
};
