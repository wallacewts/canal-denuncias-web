import { type AfterViewInit, Component, inject, viewChild } from '@angular/core';
import { PageHeader } from '@canal/shared';
import type { Timed } from './auth.api';
import type { ProvisionalStepResponse } from './auth.types';
import { PasswordChangeForm } from './password-change-form';
import { SignInFlow } from './sign-in-flow';

/** Troca da senha provisória no primeiro acesso (BAUTH-04). Depois dela, a API indica o cadastro do segundo fator. */
@Component({
  selector: 'app-password-change-page',
  imports: [PageHeader, PasswordChangeForm],
  template: `
    <lib-page-header
      title="Trocar senha"
      subtitle="No primeiro acesso, troque a senha provisória que você recebeu da administração."
    />
    <app-password-change-form (changed)="next($event)" />
  `,
})
export class PasswordChangePage implements AfterViewInit {
  private readonly flow = inject(SignInFlow);
  private readonly header = viewChild.required(PageHeader);

  ngAfterViewInit(): void {
    this.header().focus();
  }

  protected next(step: Timed<ProvisionalStepResponse>): void {
    void this.flow.advance(step);
  }
}
