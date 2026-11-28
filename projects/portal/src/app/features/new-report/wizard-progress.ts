import { Component, computed, input } from '@angular/core';
import { WIZARD_STEPS } from './wizard-steps';

/** Indicador de progresso (FR-006): "Etapa N de 5 · Nome", com `aria-current="step"` na etapa atual. */
@Component({
  selector: 'app-wizard-progress',
  template: `
    <nav aria-label="Progresso da denúncia">
      <p class="summary">
        Etapa {{ index() + 1 }} de {{ steps.length }} · {{ steps[index()].title }}
      </p>
      <ol class="steps">
        @for (step of steps; track step.path; let i = $index) {
          <li
            [attr.aria-current]="i === index() ? 'step' : null"
            [class.current]="i === index()"
            [class.done]="i < index()"
          >
            <span class="number">{{ i + 1 }}</span>
            <span class="title">{{ step.title }}</span>
          </li>
        }
      </ol>
    </nav>
  `,
  styles: `
    .summary {
      margin: 0 0 0.5rem;
      font: var(--mat-sys-label-large);
    }
    .steps {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1rem;
      list-style: none;
      margin: 0 0 1.5rem;
      padding: 0;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .number {
      margin-inline-end: 0.25rem;
    }
    .current {
      color: var(--mat-sys-on-surface);
      font-weight: 600;
    }
  `,
})
export class WizardProgress {
  readonly currentPath = input.required<string>();
  protected readonly steps = WIZARD_STEPS;
  protected readonly index = computed(() =>
    Math.max(
      0,
      this.steps.findIndex((s) => s.path === this.currentPath()),
    ),
  );
}
