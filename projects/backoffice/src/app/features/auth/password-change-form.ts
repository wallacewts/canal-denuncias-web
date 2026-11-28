import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, output, signal } from '@angular/core';
import {
  type AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FieldErrorLink, FormFieldError, SensitiveInput } from '@canal/shared';
import { finalize } from 'rxjs';
import { AuthApi, type Timed } from './auth.api';
import { type StepResponse, errorCodes } from './auth.types';
import { StaffSession } from './staff-session';

/** Mínimo da política (AUTH-05). Só tamanho e confirmação são conferidos na tela; senha comum é decidida pela API. */
const MIN_LENGTH = 12;

const sameAsNew = (group: AbstractControl): ValidationErrors | null => {
  const next = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword');
  if (!confirm?.value || confirm.value === next) {
    if (confirm?.hasError('mismatch')) confirm.setErrors(null);
    return null;
  }
  confirm.setErrors({ ...(confirm.errors ?? {}), mismatch: true });
  return null;
};

/**
 * Formulário de troca de senha (BAUTH-04, reaproveitado em "Meu perfil", BPRF-02). Senha atual errada (422
 * `CURRENT_PASSWORD_INVALID`) vira erro no campo, sem encerrar a sessão; o 5º erro (429) encerra a sessão pela API e
 * aqui pelo `StaffSession`. Os campos são limpos a cada envio.
 */
@Component({
  selector: 'app-password-change-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    SensitiveInput,
    FormFieldError,
    FieldErrorLink,
  ],
  template: `
    <p class="policy">
      A nova senha precisa ter pelo menos 12 caracteres e não pode ser uma senha comum.
    </p>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <mat-form-field appearance="outline">
        <mat-label>Senha atual</mat-label>
        <input
          matInput
          type="password"
          formControlName="currentPassword"
          autocomplete="current-password"
          appSensitiveInput
          [libFieldError]="currentError"
        />
      </mat-form-field>
      <lib-form-field-error
        #currentError
        [control]="form.controls.currentPassword"
        [messages]="{
          required: 'Informe a senha atual.',
          currentInvalid: 'Senha atual incorreta.',
        }"
      />
      <mat-form-field appearance="outline">
        <mat-label>Nova senha</mat-label>
        <input
          matInput
          type="password"
          formControlName="newPassword"
          autocomplete="new-password"
          appSensitiveInput
          [libFieldError]="newError"
        />
      </mat-form-field>
      <lib-form-field-error
        #newError
        [control]="form.controls.newPassword"
        [messages]="{
          required: 'Informe a nova senha.',
          minlength: 'A nova senha precisa ter pelo menos 12 caracteres.',
          tooShort: 'A nova senha precisa ter pelo menos 12 caracteres.',
          common: 'Essa senha é comum demais. Escolha outra.',
          same: 'A nova senha precisa ser diferente da atual.',
          tooLong:
            'A nova senha é longa demais. Use uma senha mais curta, com pelo menos 12 caracteres.',
        }"
      />
      <mat-form-field appearance="outline">
        <mat-label>Confirme a nova senha</mat-label>
        <input
          matInput
          type="password"
          formControlName="confirmPassword"
          autocomplete="new-password"
          appSensitiveInput
          [libFieldError]="confirmError"
        />
      </mat-form-field>
      <lib-form-field-error
        #confirmError
        [control]="form.controls.confirmPassword"
        [messages]="{
          required: 'Confirme a nova senha.',
          mismatch: 'A confirmação precisa ser igual à nova senha.',
        }"
      />
      <p role="status" class="status">{{ submitting() ? 'Trocando a senha…' : '' }}</p>
      <button mat-flat-button type="submit" [disabled]="submitting()">Trocar senha</button>
    </form>
  `,
  styles: `
    form {
      display: grid;
      gap: 0.25rem;
      max-width: 28rem;
    }
    .policy {
      max-width: 65ch;
    }
    .status:empty {
      margin: 0;
    }
  `,
})
export class PasswordChangeForm {
  private readonly api = inject(AuthApi);
  private readonly session = inject(StaffSession);

  readonly changed = output<Timed<StepResponse>>();
  /** Envio válido começou (a tela que usa o formulário limpa avisos do envio anterior). */
  readonly started = output<void>();

  protected readonly submitting = signal(false);
  protected readonly form = new FormGroup(
    {
      currentPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(MIN_LENGTH)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [sameAsNew] },
  );

  protected submit(): void {
    if (this.submitting()) return;
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();
    if (this.form.invalid) return;
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.form.reset();
    this.started.emit();
    this.submitting.set(true);
    this.api
      .changePassword(currentPassword, newPassword)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (step) => this.changed.emit(step),
        error: (error: unknown) => {
          if (!(error instanceof HttpErrorResponse)) return;
          if (error.status === 429) return this.session.end('unauthenticated');
          if (error.status !== 422) return;
          const codes = errorCodes(error.error);
          const mark = (control: AbstractControl, key: string) => {
            control.setErrors({ [key]: true });
            control.markAsTouched();
          };
          if (codes.includes('CURRENT_PASSWORD_INVALID'))
            mark(this.form.controls.currentPassword, 'currentInvalid');
          if (codes.includes('PASSWORD_TOO_SHORT'))
            mark(this.form.controls.newPassword, 'tooShort');
          if (codes.includes('PASSWORD_TOO_LONG')) mark(this.form.controls.newPassword, 'tooLong');
          if (codes.includes('PASSWORD_COMMON')) mark(this.form.controls.newPassword, 'common');
          if (codes.includes('PASSWORD_SAME_AS_CURRENT'))
            mark(this.form.controls.newPassword, 'same');
        },
      });
  }
}
