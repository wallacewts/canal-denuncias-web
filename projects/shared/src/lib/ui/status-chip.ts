import { Component, input } from '@angular/core';

export const STATUS_TONES = ['neutral', 'info', 'success', 'warning', 'danger'] as const;
export type StatusTone = (typeof STATUS_TONES)[number];

/** Indicador de status: o significado está sempre no texto; a cor só reforça (WCAG 1.4.1). */
@Component({
  selector: 'lib-status-chip',
  host: { '[class]': '"tone-" + tone()' },
  template: `{{ label() }}`,
  styles: `
    :host {
      display: inline-block;
      padding: 0.125rem 0.625rem;
      border-radius: 999px;
      font: var(--mat-sys-label-large);
      border: 1px solid currentColor;
    }
    :host(.tone-neutral) {
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface);
    }
    :host(.tone-info) {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    :host(.tone-success) {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    :host(.tone-warning) {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    :host(.tone-danger) {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
  `,
})
export class StatusChip {
  readonly label = input.required<string>();
  readonly tone = input<StatusTone>('neutral');
}
