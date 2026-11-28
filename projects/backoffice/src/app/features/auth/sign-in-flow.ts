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
 * sem etapa (ou com a sessão pendente expirada) volta ao login (R5). Sem etapa em memória (recarga), tenta o `/me`: a
 * troca de senha exigida depois do segundo fator é restaurada por ele; antes do segundo fator, o `/me` dá 401 e a
 * pessoa volta ao login.
 */
export function stepGuard(step: PendingStep): CanActivateFn {
  return async () => {
    const session = inject(StaffSession);
    const router = inject(Router);
    const toStep = () => {
      const pending = session.pending();
      if (!pending || session.pendingExpired()) return null;
      return pending.step === step ? true : router.parseUrl(stepRoute(pending.step));
    };
    const inMemory = toStep();
    if (inMemory) return inMemory;
    if (await session.restore()) return router.parseUrl(stepRoute('DONE'));
    return toStep() ?? router.parseUrl('/login');
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

  /**
   * A API recusou uma rota de etapa fora da etapa (403 `STEP_NOT_ALLOWED`): leva à etapa certa, sem encerrar a sessão e
   * sem mensagem. Sessão completa vai ao painel; troca de senha exigida (vista pelo `/me`) vai à troca; antes do
   * segundo fator o `/me` dá 401 e vale a etapa em memória.
   */
  async goToCurrentStep(): Promise<void> {
    const go = (url: string) => this.router.navigateByUrl(url, { replaceUrl: true });
    if (this.session.authenticated()) return void (await go(stepRoute('DONE')));
    if (await this.session.restore()) return void (await go(stepRoute('DONE')));
    const pending = this.session.pending();
    await go(pending ? stepRoute(pending.step) : '/login');
  }

  /** Sessão verificada: carrega o usuário e vai para o caminho de retorno (ou o painel). */
  async finish(): Promise<void> {
    const { value, serverNow } = await firstValueFrom(this.api.me());
    this.session.establish(value, serverNow);
    await this.router.navigateByUrl(this.session.consumeReturnUrl(), { replaceUrl: true });
  }
}
