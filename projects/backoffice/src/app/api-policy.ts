import type { ApiPolicy } from '@canal/shared';

/** Backoffice: envia o cookie HttpOnly da sessão da equipe e nunca usa token de denunciante. */
export const BACKOFFICE_API_POLICY: ApiPolicy = {
  withCredentials: true,
  bearerFor: null,
  // Implementado na T038 (US2): ir para /login.
  onUnauthenticated: () => undefined,
};
