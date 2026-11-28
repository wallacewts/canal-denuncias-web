import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { FieldErrorLink, FormFieldError, PageHeader, SensitiveInput } from '@canal/shared';
import { finalize } from 'rxjs';
import { AuthApi } from './auth.api';
import { SignInFlow } from './sign-in-flow';
import { StaffSession } from './staff-session';

const TOTP = /^\d{6}$/;

/**
 * Desafio do segundo fator (BAUTH-02): código de seis dígitos do aplicativo autenticador ou um código de recuperação.
 * Código errado tem mensagem genérica; o bloqueio temporário (423) tem mensagem própria, sem dizer o motivo. Se a
 * sessão pendente já expirou (horário da API), volta ao login com a mensagem de sessão encerrada.
 */
@Component({
  selector: 'app-mfa-challenge-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
    PageHeader,
    SensitiveInput,
    FormFieldError,
    FieldErrorLink,
  ],
  template: `
    <main class="page">
      <lib-page-header
        title="Código de verificação"
        [subtitle]="
          recovery()
            ? 'Informe um dos códigos de recuperação que você guardou. Cada código vale uma única vez.'
            : 'Abra o aplicativo autenticador e informe o código de seis dígitos.'
        "
      />
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>{{
            recovery() ? 'Código de recuperação' : 'Código de seis dígitos'
          }}</mat-label>
          <input
            matInput
            type="text"
            formControlName="code"
            autocomplete="one-time-code"
            [attr.inputmode]="recovery() ? 'text' : 'numeric'"
            [attr.maxlength]="recovery() ? 64 : 6"
            appSensitiveInput
            [libFieldError]="codeError"
          />
        </mat-form-field>
        <lib-form-field-error
          #codeError
          [control]="form.controls.code"
          [messages]="
            recovery()
              ? { required: 'Informe o código de recuperação.' }
              : { required: 'Informe o código.', pattern: 'O código tem seis dígitos.' }
          "
        />
        @if (failure(); as message) {
          <p role="alert" class="error">{{ message }}</p>
        }
        <p role="status" class="status">{{ submitting() ? 'Verificando…' : '' }}</p>
        <div class="actions">
          <button mat-flat-button type="submit" [disabled]="submitting()">Verificar</button>
          <button mat-button type="button" data-testid="use-recovery" (click)="toggleRecovery()">
            {{ recovery() ? 'Usar o código do aplicativo' : 'Usar um código de recuperação' }}
          </button>
          <a mat-button routerLink="/login" replaceUrl>Voltar</a>
        </div>
      </form>
    </main>
  `,
  styles: `
    .page {
      max-width: 28rem;
      margin: 2rem auto;
      padding-inline: max(16px, env(safe-area-inset-left));
    }
    form {
      display: grid;
      gap: 0.25rem;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .error {
      color: var(--mat-sys-error);
      font-weight: 600;
    }
    .status:empty {
      margin: 0;
    }
  `,
})
export class MfaChallengePage {
  private readonly api = inject(AuthApi);
  private readonly flow = inject(SignInFlow);
  private readonly session = inject(StaffSession);

  protected readonly recovery = signal(false);
  protected readonly submitting = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly form = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(TOTP)],
    }),
  });

  protected toggleRecovery(): void {
    this.recovery.update((r) => !r);
    const code = this.form.controls.code;
    code.setValidators(
      this.recovery() ? [Validators.required] : [Validators.required, Validators.pattern(TOTP)],
    );
    code.reset();
    this.failure.set(null);
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.controls.code.value.trim();
    this.form.controls.code.reset();
    this.failure.set(null);
    this.submitting.set(true);
    this.api
      .challenge(this.recovery() ? { recoveryCode: value } : { code: value })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (step) => void this.flow.advance(step),
        error: (error: unknown) => {
          if (!(error instanceof HttpErrorResponse))
            return this.failure.set('Código inválido. Confira e tente de novo.');
          if (error.status === 423) {
            this.failure.set('Muitas tentativas. Aguarde alguns minutos e entre de novo.');
          } else if (error.status === 401) {
            if (this.session.pendingExpired()) this.session.end('unauthenticated');
            else this.failure.set('Código inválido. Confira e tente de novo.');
          }
        },
      });
  }
}
