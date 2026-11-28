import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FieldErrorLink, FormFieldError, PageHeader, SensitiveInput } from '@canal/shared';
import { finalize } from 'rxjs';
import { AuthApi } from './auth.api';
import { END_MESSAGES } from './end-messages';
import { SignInFlow } from './sign-in-flow';
import { StaffSession } from './staff-session';

/**
 * Login da equipe (BAUTH-01). Qualquer falha da etapa da senha (e-mail inexistente, senha errada, conta bloqueada ou
 * desativada, excesso de tentativas) recebe a mesma mensagem, para não revelar se o e-mail existe. A senha é limpa a
 * cada envio. Nenhum token: a sessão é o cookie HttpOnly da API.
 */
@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    PageHeader,
    SensitiveInput,
    FormFieldError,
    FieldErrorLink,
  ],
  template: `
    <main class="page">
      <lib-page-header
        title="Entrar"
        subtitle="Backoffice do Canal de Denúncias, só para a equipe."
      />
      <p role="status" data-testid="end-reason" class="end-reason">{{ endMessage }}</p>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>E-mail</mat-label>
          <input
            matInput
            type="email"
            formControlName="email"
            autocomplete="username"
            appSensitiveInput
            [libFieldError]="emailError"
          />
        </mat-form-field>
        <lib-form-field-error
          #emailError
          [control]="form.controls.email"
          [messages]="{ required: 'Informe o e-mail.' }"
        />
        <mat-form-field appearance="outline">
          <mat-label>Senha</mat-label>
          <input
            matInput
            type="password"
            formControlName="password"
            autocomplete="current-password"
            appSensitiveInput
            [libFieldError]="passwordError"
          />
        </mat-form-field>
        <lib-form-field-error
          #passwordError
          [control]="form.controls.password"
          [messages]="{ required: 'Informe a senha.' }"
        />
        @if (failed()) {
          <p role="alert" class="error">E-mail ou senha inválidos.</p>
        }
        <p role="status" class="status">{{ submitting() ? 'Entrando…' : '' }}</p>
        <button mat-flat-button type="submit" [disabled]="submitting()">Entrar</button>
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
    .error {
      color: var(--mat-sys-error);
      font-weight: 600;
    }
    .end-reason:empty,
    .status:empty {
      margin: 0;
    }
  `,
})
export class LoginPage {
  private readonly api = inject(AuthApi);
  private readonly flow = inject(SignInFlow);
  private readonly session = inject(StaffSession);

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly submitting = signal(false);
  protected readonly failed = signal(false);
  protected readonly endMessage = (() => {
    const reason = this.session.consumeEndReason();
    return reason ? END_MESSAGES[reason] : '';
  })();

  protected submit(): void {
    if (this.submitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    this.form.controls.password.reset();
    this.form.controls.password.markAsUntouched();
    this.failed.set(false);
    this.submitting.set(true);
    this.api
      .signIn(email.trim(), password)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (step) => void this.flow.advance(step),
        // 401, 429 e resposta fora do formato: a mesma mensagem. Outros erros já foram avisados pela base de erros.
        error: (error: unknown) => {
          const status = (error as { status?: number }).status;
          if (status === undefined || status === 401 || status === 429) this.failed.set(true);
        },
      });
  }
}
