import { inject } from '@angular/core';
import type { ApiPolicy } from '@canal/shared';
import { errorCodes } from './features/auth/auth.types';
import { SignInFlow } from './features/auth/sign-in-flow';
import { StaffSession } from './features/auth/staff-session';

/**
 * Backoffice: envia o cookie HttpOnly da sessão da equipe e nunca usa token de denunciante. O 401 é silencioso: o
 * `StaffSession` encerra a sessão e a tela de login mostra o motivo (uma única mensagem, research R1). O 403
 * `PASSWORD_CHANGE_REQUIRED` (segundo fator feito, troca de senha exigida) leva à troca de senha, sem a mensagem de
 * acesso negado. O 403 `STEP_NOT_ALLOWED` (rota de etapa fora da etapa) leva à etapa certa, sem encerrar a sessão.
 */
export const BACKOFFICE_API_POLICY: ApiPolicy = {
  audience: 'backoffice',
  withCredentials: true,
  bearerFor: null,
  silentUnauthenticated: true,
  onUnauthenticated: () => inject(StaffSession).end('unauthenticated'),
  onForbidden: (body) => {
    const codes = errorCodes(body);
    if (codes.includes('PASSWORD_CHANGE_REQUIRED')) {
      inject(StaffSession).requirePasswordChange();
      return true;
    }
    if (codes.includes('STEP_NOT_ALLOWED')) {
      void inject(SignInFlow).goToCurrentStep();
      return true;
    }
    return false;
  },
};
