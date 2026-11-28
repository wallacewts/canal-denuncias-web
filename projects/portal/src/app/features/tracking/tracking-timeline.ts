import { Component, input } from '@angular/core';
import { PortalDatePipe } from '@canal/shared';
import { statusLabel } from './tracking-labels';
import type { ProvisionalTimelineEntry } from './tracking.types';

/** Linha do tempo (PTRK-01): só datas e status públicos, sem hora, sem justificativas e sem nome de quem tratou. */
@Component({
  selector: 'app-tracking-timeline',
  imports: [PortalDatePipe],
  template: `
    <section aria-labelledby="tracking-timeline-title">
      <h2 id="tracking-timeline-title">Linha do tempo</h2>
      <ol data-testid="timeline">
        @for (entry of entries(); track $index) {
          <li>
            <span class="date">{{ entry.on | portalDate }}</span> — {{ label(entry.status) }}
          </li>
        }
      </ol>
    </section>
  `,
  styles: `
    h2 {
      font: var(--mat-sys-title-medium);
      margin: 0 0 0.5rem;
    }
    ol {
      margin: 0;
      padding-inline-start: 1.25rem;
    }
    .date {
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class TrackingTimeline {
  readonly entries = input.required<readonly ProvisionalTimelineEntry[]>();
  protected readonly label = statusLabel;
}
