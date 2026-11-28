import { HttpErrorResponse } from '@angular/common/http';
import { Component, Injectable, type OnDestroy, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { FieldErrorLink, FormFieldError, PageHeader, SensitiveInput } from '@canal/shared';
import { finalize } from 'rxjs';
import { normalizeProtocol } from './normalize-protocol';
import { type EndReason, ReporterAccess } from './reporter-access';
import { TrackingApi } from './tracking.api';
import { InvalidTrackingResponseError } from './tracking.types';

const END_MESSAGES: Record<EndReason, string> = {
  expired: 'Seu acesso terminou. Informe o protocolo e a chave de novo.',
  logout: 'Você saiu do acompanhamento.',
};

/** Erros respondidos com a mensagem genérica (PACC-02): nunca dizem qual dado estava errado. */
const GENERIC_STATUSES = new Set([400, 401, 429]);

/** Formulário da consulta com escopo de tela (D35): protocolo e chave morrem com a tela e são limpos no sucesso. */
@Injectable()
export class TrackingAccessForm implements OnDestroy {
  readonly form = new FormGroup({
    protocol: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    accessKey: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  clear(): void {
    this.form.reset();
  }

  ngOnDestroy(): void {
    this.clear();
  }
}

/** Consulta da denúncia (PACC-02): protocolo e chave só no corpo, mensagem genérica, credencial só em memória. */
@Component({
  selector: 'app-tracking-access-page',
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
  providers: [TrackingAccessForm],
  template: `
    <lib-page-header
      title="Consultar denúncia"
      subtitle="Informe o protocolo e a chave que você recebeu ao enviar a denúncia."
    />
    <p role="status" data-testid="end-reason" class="end-reason">{{ endMessage }}</p>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <mat-form-field appearance="outline">
        <mat-label>Protocolo</mat-label>
        <input
          matInput
          type="text"
          formControlName="protocol"
          autocapitalize="characters"
          appSensitiveInput
          [libFieldError]="protocolError"
        />
      </mat-form-field>
      <lib-form-field-error
        #protocolError
        [control]="form.controls.protocol"
        [messages]="{ required: 'Informe o protocolo.' }"
      />
      <div class="key-row">
        <mat-form-field appearance="outline">
          <mat-label>Chave de acesso</mat-label>
          <input
            matInput
            id="access-key"
            [type]="showKey() ? 'text' : 'password'"
            formControlName="accessKey"
            appSensitiveInput
            [libFieldError]="keyError"
          />
        </mat-form-field>
        <button
          mat-button
          type="button"
          aria-controls="access-key"
          [attr.aria-pressed]="showKey()"
          (click)="showKey.set(!showKey())"
        >
          {{ showKey() ? 'Ocultar chave' : 'Mostrar chave' }}
        </button>
      </div>
      <lib-form-field-error
        #keyError
        [control]="form.controls.accessKey"
        [messages]="{ required: 'Informe a chave de acesso.' }"
      />
      @if (failed()) {
        <p role="alert" class="error">Protocolo ou chave inválidos.</p>
      }
      <p role="status" class="status">{{ submitting() ? 'Consultando…' : '' }}</p>
      <button mat-flat-button type="submit" [disabled]="submitting()">Consultar</button>
    </form>
    <!--
      Seção sem aria-labelledby, de propósito: no Firefox, com o campo de senha preenchido, calcular o nome acessível de
      uma seção rotulada pelo h2 derruba a página (achado no e2e da feature 003; ver docs/validacoes/acompanhamento.md).
      O h2 continua dando a estrutura de títulos.
    -->
    <section class="guidance">
      <h2>Se estiver num computador de outra pessoa</h2>
      <p>
        Use, de preferência, um dispositivo pessoal. Não salve a chave no navegador. Ao terminar,
        clique em Sair e feche a aba.
      </p>
    </section>
  `,
  styles: `
    form {
      display: grid;
      gap: 0.25rem;
      max-width: 32rem;
    }
    .key-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .key-row mat-form-field {
      flex: 1 1 16rem;
    }
    .error {
      color: var(--mat-sys-error);
      font-weight: 600;
    }
    .end-reason:empty,
    .status:empty {
      margin: 0;
    }
    .guidance {
      margin-block-start: 2rem;
      max-width: 65ch;
    }
    .guidance h2 {
      font: var(--mat-sys-title-medium);
    }
  `,
})
export class TrackingAccessPage {
  private readonly api = inject(TrackingApi);
  private readonly access = inject(ReporterAccess);
  private readonly router = inject(Router);
  private readonly state = inject(TrackingAccessForm);

  protected readonly form = this.state.form;
  protected readonly showKey = signal(false);
  protected readonly submitting = signal(false);
  protected readonly failed = signal(false);
  protected readonly endMessage = (() => {
    const reason = this.access.consumeEndReason();
    return reason ? END_MESSAGES[reason] : '';
  })();

  protected submit(): void {
    if (this.submitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.failed.set(false);
    this.submitting.set(true);
    const { protocol, accessKey } = this.form.getRawValue();
    this.api
      .openAccess({ protocol: normalizeProtocol(protocol), accessKey })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: ({ token, expiresAt }) => {
          this.state.clear();
          this.access.open(token, expiresAt);
          void this.router.navigateByUrl('/acompanhamento');
        },
        error: (error: unknown) => {
          const generic =
            error instanceof InvalidTrackingResponseError ||
            (error instanceof HttpErrorResponse && GENERIC_STATUSES.has(error.status));
          if (generic) this.failed.set(true);
        },
      });
  }
}
