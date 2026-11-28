import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FieldErrorLink, FormFieldError, PortalDatePipe, SensitiveInput } from '@canal/shared';
import { finalize, forkJoin } from 'rxjs';
import { ReporterAccess } from './reporter-access';
import { MESSAGE_AUTHOR_LABELS } from './tracking-labels';
import { TrackingApi } from './tracking.api';
import type { MessageAuthor } from './tracking.types';
import { TrackingViewState } from './tracking-view.state';

export const MAX_MESSAGE_LENGTH = 5_000;

/**
 * Mensagens com a equipe (PTRK-02): lista em ordem, "Equipe de apuração" sem nome, só datas, busca só pelo botão
 * "Atualizar" (Q1), envio protegido contra clique duplo. Texto exibido por interpolação, nunca como HTML.
 */
@Component({
  selector: 'app-tracking-messages',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    PortalDatePipe,
    SensitiveInput,
    FormFieldError,
    FieldErrorLink,
  ],
  template: `
    <section aria-labelledby="messages-title">
      <div class="heading">
        <h2 id="messages-title">Mensagens</h2>
        <button mat-stroked-button type="button" [disabled]="refreshing()" (click)="refresh()">
          Atualizar
        </button>
      </div>
      <p aria-live="polite" data-testid="messages-live" class="live">{{ liveText() }}</p>
      @if (messages().length) {
        <ol data-testid="messages" class="messages">
          @for (m of messages(); track m.id) {
            <li [class.team]="m.author === 'TEAM'">
              <p class="meta">
                <strong>{{ author(m.author) }}</strong> · <span>{{ m.sentOn | portalDate }}</span>
              </p>
              <p class="body">{{ m.body }}</p>
            </li>
          }
        </ol>
      } @else {
        <p>Ainda não há mensagens.</p>
        @if (canReply()) {
          <p>Use o campo abaixo para escrever à equipe de apuração.</p>
        }
      }
      @if (canReply()) {
        <form [formGroup]="form" (ngSubmit)="send()" novalidate>
          <mat-form-field appearance="outline">
            <mat-label>Sua mensagem</mat-label>
            <textarea
              matInput
              id="reply-field"
              rows="5"
              [formControl]="reply"
              appSensitiveInput
              [spellcheckAllowed]="true"
              [libFieldError]="replyError"
            ></textarea>
            <mat-hint>Restam {{ remaining() }} caracteres</mat-hint>
          </mat-form-field>
          <lib-form-field-error
            #replyError
            [control]="reply"
            [messages]="{
              required: 'Escreva a mensagem antes de enviar.',
              maxlength: 'Use no máximo 5.000 caracteres.',
            }"
          />
          <p role="status" class="status">{{ sending() ? 'Enviando a mensagem…' : '' }}</p>
          <button mat-flat-button type="submit" [disabled]="sending() || !canSend()">
            Enviar mensagem
          </button>
        </form>
      } @else {
        <p data-testid="closed-note">
          Esta denúncia foi encerrada. Você ainda pode ler as mensagens, mas não pode enviar novas.
        </p>
      }
    </section>
  `,
  styles: `
    .heading {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    h2 {
      font: var(--mat-sys-title-medium);
      margin: 0;
    }
    .messages {
      list-style: none;
      margin: 0 0 1rem;
      padding: 0;
      display: grid;
      gap: 0.75rem;
    }
    .messages li {
      padding: 0.75rem 1rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 8px;
    }
    .messages li.team {
      background: var(--mat-sys-surface-container);
    }
    .meta {
      margin: 0 0 0.25rem;
      font: var(--mat-sys-body-small);
    }
    .body {
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    form {
      display: grid;
      gap: 0.25rem;
    }
    .live:empty,
    .status:empty {
      margin: 0;
    }
  `,
})
export class TrackingMessages {
  private readonly api = inject(TrackingApi);
  private readonly access = inject(ReporterAccess);
  private readonly view = inject(TrackingViewState);

  protected readonly reply = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(MAX_MESSAGE_LENGTH)],
  });
  protected readonly form = new FormGroup({ reply: this.reply });
  private readonly replyValue = toSignal(this.reply.valueChanges, { initialValue: '' });

  protected readonly messages = computed(() => this.view.value()?.messages ?? []);
  protected readonly canReply = computed(() => this.view.value()?.report.canReply ?? false);
  protected readonly remaining = computed(() =>
    Math.max(0, MAX_MESSAGE_LENGTH - this.replyValue().length),
  );
  protected readonly canSend = computed(() => {
    const length = this.replyValue().trim().length;
    return length > 0 && this.replyValue().length <= MAX_MESSAGE_LENGTH;
  });
  protected readonly refreshing = signal(false);
  protected readonly sending = signal(false);
  protected readonly liveText = signal('');

  protected author(author: MessageAuthor): string {
    return MESSAGE_AUTHOR_LABELS[author];
  }

  protected refresh(): void {
    if (this.refreshing()) return;
    const generation = this.access.generation();
    const before = new Set(this.messages().map((m) => m.id));
    this.refreshing.set(true);
    this.api
      .messages()
      .pipe(finalize(() => this.refreshing.set(false)))
      .subscribe((messages) => {
        const current = this.view.value();
        if (!current || !this.access.isCurrent(generation)) return;
        this.view.set({ ...current, messages });
        const count = messages.filter((m) => !before.has(m.id)).length;
        this.liveText.set(
          count === 0
            ? 'Nenhuma mensagem nova'
            : `${count} ${count === 1 ? 'mensagem nova' : 'mensagens novas'}`,
        );
      });
  }

  protected send(): void {
    if (this.sending()) return;
    this.reply.markAsTouched();
    if (!this.canSend()) return;
    const generation = this.access.generation();
    this.sending.set(true);
    this.api
      .send(this.reply.value)
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: () => {
          if (!this.access.isCurrent(generation)) return;
          this.reply.reset();
          this.reload(generation);
        },
        error: (error: unknown) => {
          // 409: a denúncia foi encerrada. A tela passa a mostrar as mensagens sem o campo de resposta.
          if (error instanceof HttpErrorResponse && error.status === 409) this.reload(generation);
        },
      });
  }

  private reload(generation: number): void {
    forkJoin({ report: this.api.report(), messages: this.api.messages() }).subscribe((view) => {
      if (this.access.isCurrent(generation)) this.view.set(view);
    });
  }
}
