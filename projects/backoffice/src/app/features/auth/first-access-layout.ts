import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EnrollmentState } from './enrollment-state';

/** Componente-pai do primeiro acesso: fornece o estado de tela compartilhado pelas etapas (R5, R7). */
@Component({
  selector: 'app-first-access-layout',
  imports: [RouterOutlet],
  providers: [EnrollmentState],
  template: `<main class="page"><router-outlet /></main>`,
  styles: `
    .page {
      max-width: 36rem;
      margin: 2rem auto;
      padding-inline: max(16px, env(safe-area-inset-left));
    }
  `,
})
export class FirstAccessLayout {}
