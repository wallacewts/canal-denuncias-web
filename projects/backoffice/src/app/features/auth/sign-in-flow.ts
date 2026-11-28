import { Injectable, inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi, type Timed } from './auth.api';
import type { NextStep, PendingStep, ProvisionalStepResponse } from './auth.types';
import { StaffSession } from './staff-session';

const STEP_ROUTES: Record<NextStep, string> = {
  MFA_REQUIRED: '/login/codigo',
  PASSWORD_CHANGE_REQUIRED: '/primeiro-acesso/senha',
  MFA_ENROLLMENT_REQUIRED: '/primeiro-acesso/autenticador',
  DONE: '/painel',
};

export const stepRoute = (step: NextStep): string => STEP_ROUTES[step];

/**
 * Só entra na rota da etapa que a API indicou e que está em memória; pular etapas pelo endereço leva à etapa certa, e
 * sem etapa (ou com a sessão pendente expirada) volta ao login (R5).
 */
export function stepGuard(step: PendingStep): CanActivateFn {
  return () => {
    const session = inject(StaffSession);
    const router = inject(Router);
    const pending = session.pending();
    if (pending && !session.pendingExpired()) {
      return pending.step === step ? true : router.parseUrl(stepRoute(pending.step));
    }
    return router.parseUrl('/login');
  };
}

/** Avança o fluxo de entrada com a etapa que a API devolveu (R5). A ordem é decidida pela API. */
@Injectable({ providedIn: 'root' })
export class SignInFlow {
  private readonly session = inject(StaffSession);
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  async advance({ value, serverNow }: Timed<ProvisionalStepResponse>): Promise<void> {
    if (value.nextStep === 'DONE') return this.finish();
    this.session.startPending(value.nextStep, value, serverNow);
    await this.router.navigateByUrl(stepRoute(value.nextStep), { replaceUrl: true });
  }

  /** Sessão verificada: carrega o usuário e vai para o caminho de retorno (ou o painel). */
  async finish(): Promise<void> {
    const { value, serverNow } = await firstValueFrom(this.api.me());
    this.session.establish(value, serverNow);
    await this.router.navigateByUrl(this.session.consumeReturnUrl(), { replaceUrl: true });
  }
}
