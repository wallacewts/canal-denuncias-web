import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface WizardStep {
  path: string;
  label: string;
}

/**
 * Nova denúncia em etapas. Os dados ficam só em memória até o envio:
 * nada é salvo no navegador e nada vai na URL.
 */
@Component({
  selector: 'app-new-report-wizard',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <h1>Nova denúncia</h1>
    <nav aria-label="Etapas da denúncia">
      <ol class="steps">
        @for (step of steps; track step.path) {
          <li>
            <a [routerLink]="step.path" routerLinkActive="active" ariaCurrentWhenActive="step">{{
              step.label
            }}</a>
          </li>
        }
      </ol>
    </nav>
    <router-outlet />
    <p><a routerLink="/nova-denuncia/revisao">Ir para a revisão</a></p>
  `,
  styles: `
    .steps {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
      padding-left: 1.25rem;
    }
    .active {
      font-weight: 600;
    }
  `,
})
export class NewReportWizard {
  protected readonly steps: WizardStep[] = [
    { path: 'tipo', label: 'Quem relata' },
    { path: 'categoria', label: 'Categoria' },
    { path: 'relato', label: 'Relato' },
    { path: 'envolvidos', label: 'Envolvidos' },
    { path: 'anexos', label: 'Anexos' },
    { path: 'identificacao', label: 'Identificação' },
  ];
}
