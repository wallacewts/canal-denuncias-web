import { Component, input } from '@angular/core';

/** Estado vazio: sempre com texto, nunca só com ícone. */
@Component({
  selector: 'lib-empty-state',
  template: `
    <p class="title">{{ title() }}</p>
    @if (description()) {
      <p class="description">{{ description() }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      padding: 2rem 1rem;
      text-align: center;
    }
    p {
      margin: 0;
    }
    .title {
      font: var(--mat-sys-title-medium);
    }
    .description {
      margin-top: 0.5rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input<string>();
}
