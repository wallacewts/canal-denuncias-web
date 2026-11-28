import { type AfterViewInit, Component, inject, viewChild } from '@angular/core';
import { PageHeader } from '@canal/shared';
import type { Timed } from './auth.api';
import type { ProvisionalStepResponse } from './auth.types';
import { PasswordChangeForm } from './password-change-form';
import { SignInFlow } from './sign-in-flow';

/**
 * Troca da senha provisória (BAUTH-04). No primeiro acesso vem antes do cadastro do segundo fator; para quem já tem
 * autenticador (senha redefinida), vem depois do desafio. A ordem é decidida pela API.
 */
@Component({
  selector: 'app-password-change-page',
  imports: [PageHeader, PasswordChangeForm],
  template: `
    <lib-page-header
      title="Trocar senha"
      subtitle="Troque a senha provisória que você recebeu da administração antes de continuar."
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
