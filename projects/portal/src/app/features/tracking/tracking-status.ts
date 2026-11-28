import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { PortalDatePipe, StatusChip, type StatusTone } from '@canal/shared';
import { outcomeLabel, statusLabel } from './tracking-labels';
import type { ProvisionalTrackingReport, PublicStatus } from './tracking.types';

const TONES: Record<PublicStatus, StatusTone> = {
  RECEIVED: 'neutral',
  IN_REVIEW: 'info',
  AWAITING_REPORTER: 'warning',
  CLOSED: 'neutral',
  CONCLUDED: 'success',
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Andamento (PTRK-01): status em texto, desfecho quando concluída, categoria, recebimento e prazo de resposta. */
@Component({
  selector: 'app-tracking-status',
  imports: [MatButtonModule, PortalDatePipe, StatusChip],
  template: `
    <section aria-labelledby="tracking-status-title" class="status">
      <h2 id="tracking-status-title">Situação</h2>
      <dl>
        <dt>Status</dt>
        <dd><lib-status-chip data-testid="status" [label]="label()" [tone]="tone()" /></dd>
        @if (outcome(); as o) {
          <dt>Desfecho</dt>
          <dd data-testid="outcome">{{ o }}</dd>
        }
        <dt>Categoria</dt>
        <dd data-testid="category">{{ report().category.name }}</dd>
        <dt>Recebida em</dt>
        <dd data-testid="received-on">{{ report().receivedOn | portalDate }}</dd>
      </dl>
      @if (report().status === 'AWAITING_REPORTER' && report().replyDeadline; as deadline) {
        <div class="deadline">
          <p data-testid="reply-deadline">
            <strong
              >{{ overdue() ? 'Prazo vencido em' : 'Responda até' }}
              {{ deadline | portalDate }}</strong
            >
          </p>
          <p>A equipe de apuração precisa de uma resposta sua para continuar.</p>
          <button mat-flat-button type="button" (click)="replyNow.emit()">Responder agora</button>
        </div>
      }
    </section>
  `,
  styles: `
    h2 {
      font: var(--mat-sys-title-medium);
      margin: 0 0 0.5rem;
    }
    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.5rem 1rem;
      margin: 0;
    }
    dt {
      font-weight: 600;
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .deadline {
      margin-block-start: 1rem;
      padding: 1rem;
      border: 2px solid var(--mat-sys-outline);
      border-radius: 8px;
    }
  `,
})
export class TrackingStatus {
  readonly report = input.required<ProvisionalTrackingReport>();
  readonly replyNow = output<void>();

  protected readonly label = computed(() => statusLabel(this.report().status));
  protected readonly tone = computed(() => TONES[this.report().status] ?? 'info');
  protected readonly outcome = computed(() =>
    this.report().status === 'CONCLUDED' ? outcomeLabel(this.report().outcome) : null,
  );
  protected readonly overdue = computed(() => {
    const deadline = this.report().replyDeadline;
    return deadline !== null && deadline < today();
  });
}
