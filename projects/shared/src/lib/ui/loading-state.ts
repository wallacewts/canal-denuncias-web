import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/** Carregamento: região de status ocupada, com o rótulo em texto para o leitor de tela. */
@Component({
  selector: 'lib-loading-state',
  imports: [MatProgressSpinnerModule],
  host: { role: 'status', 'aria-busy': 'true' },
  template: `
    <mat-progress-spinner mode="indeterminate" diameter="32" aria-hidden="true" />
    <span>{{ label() }}</span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
    }
  `,
})
export class LoadingState {
  readonly label = input.required<string>();
}
