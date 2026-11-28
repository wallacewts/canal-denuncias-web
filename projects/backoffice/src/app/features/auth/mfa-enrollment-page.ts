import { HttpErrorResponse } from '@angular/common/http';
import {
  type AfterViewInit,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { FieldErrorLink, FormFieldError, PageHeader, SensitiveInput } from '@canal/shared';
import { finalize } from 'rxjs';
import { AuthApi } from './auth.api';
import { EnrollmentState } from './enrollment-state';
import { StaffSession } from './staff-session';

/**
 * Cadastro do aplicativo autenticador no primeiro acesso (BAUTH-03). O QR code vem da API como PNG embutido (R6: `src`
 * de `<img>` não é sink de Trusted Types, e `img-src data:` já é permitido pela CSP). O segredo em texto é a alternativa
 * acessível. Ativa só com um código válido; aí os 10 códigos de recuperação seguem para a tela seguinte, e o segredo
 * sai da memória.
 */
@Component({
  selector: 'app-mfa-enrollment-page',
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
    <lib-page-header
      title="Cadastrar aplicativo autenticador"
      subtitle="O código do aplicativo será pedido sempre que você entrar no backoffice."
    />
    @if (enrollment(); as e) {
      <ol class="steps">
        <li>Abra o aplicativo autenticador no celular e escolha adicionar uma conta.</li>
        <li>Leia o QR code ou digite o segredo abaixo.</li>
        <li>Informe o código de seis dígitos que o aplicativo mostrar.</li>
      </ol>
      <img
        class="qr"
        [src]="e.qrCodeDataUri"
        width="200"
        height="200"
        alt="QR code do aplicativo autenticador. Se não conseguir ler, digite o segredo exibido abaixo."
      />
      <p>
        Segredo para digitação manual:
        <code data-testid="secret" class="secret">{{ secretBlocks() }}</code>
      </p>
      <form [formGroup]="form" (ngSubmit)="confirm()" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>Código de seis dígitos</mat-label>
          <input
            matInput
            type="text"
            formControlName="code"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="6"
            appSensitiveInput
            [libFieldError]="codeError"
          />
        </mat-form-field>
        <lib-form-field-error
          #codeError
          [control]="form.controls.code"
          [messages]="{ required: 'Informe o código.', pattern: 'O código tem seis dígitos.' }"
        />
        @if (failure()) {
          <p role="alert" class="error">Código inválido. Confira e tente de novo.</p>
        }
        <p role="status" class="status">{{ submitting() ? 'Confirmando…' : '' }}</p>
        <button mat-flat-button type="submit" [disabled]="submitting()">Ativar</button>
      </form>
    } @else {
      <p role="status">Preparando o cadastro…</p>
    }
  `,
  styles: `
    .qr {
      display: block;
      max-width: 100%;
      height: auto;
      image-rendering: pixelated;
      margin-block: 1rem;
    }
    .secret {
      display: inline-block;
      overflow-wrap: anywhere;
      font-size: 1.1em;
      letter-spacing: 0.05em;
    }
    form {
      display: grid;
      gap: 0.25rem;
      max-width: 28rem;
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
export class MfaEnrollmentPage implements OnInit, AfterViewInit {
  private readonly api = inject(AuthApi);
  private readonly session = inject(StaffSession);
  private readonly state = inject(EnrollmentState);
  private readonly router = inject(Router);
  private readonly header = viewChild.required(PageHeader);

  protected readonly enrollment = computed(() => this.state.value()?.enrollment ?? null);
  protected readonly secretBlocks = computed(
    () =>
      this.enrollment()
        ?.secret.match(/.{1,4}/g)
        ?.join(' ') ?? '',
  );
  protected readonly submitting = signal(false);
  protected readonly failure = signal(false);
  protected readonly form = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
    }),
  });

  ngOnInit(): void {
    this.api.startEnrollment().subscribe({
      next: (enrollment) => this.state.set({ enrollment }),
      error: () => undefined, // 401 encerra pela política; outros erros já foram avisados pela base de erros.
    });
  }

  ngAfterViewInit(): void {
    this.header().focus();
  }

  protected confirm(): void {
    if (this.submitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const code = this.form.controls.code.value;
    this.form.reset();
    this.failure.set(false);
    this.submitting.set(true);
    this.api
      .confirmEnrollment(code)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: ({ value }) => {
          this.state.set({ recoveryCodes: value.recoveryCodes });
          this.session.clearPending();
          void this.router.navigateByUrl('/primeiro-acesso/codigos', { replaceUrl: true });
        },
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            error.status === 401 &&
            this.session.pendingExpired()
          ) {
            return this.session.end('unauthenticated');
          }
          this.failure.set(true);
        },
      });
  }
}
