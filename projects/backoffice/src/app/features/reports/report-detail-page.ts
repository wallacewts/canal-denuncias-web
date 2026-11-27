import { Component, input } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { PagePlaceholder } from '@canal/shared';

/** Detalhe da denúncia. A aba Identidade só abre pelo fluxo de revelação (justificativa + aprovação do DPO). */
@Component({
  selector: 'app-report-detail-page',
  imports: [MatTabsModule, PagePlaceholder],
  template: `
    <lib-page-placeholder
      title="Detalhe da denúncia"
      description="Relato, anexos, mensagens, notas internas, histórico e identidade lacrada."
    >
      <p class="id">Denúncia {{ id() }}</p>
      <mat-tab-group>
        @for (tab of tabs; track tab) {
          <mat-tab [label]="tab"
            ><p>{{ tab }}: em construção.</p></mat-tab
          >
        }
      </mat-tab-group>
    </lib-page-placeholder>
  `,
  styles: `
    .id {
      font-family: monospace;
    }
  `,
})
export class ReportDetailPage {
  /** Vem do parâmetro de rota :id (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly tabs = [
    'Relato',
    'Anexos',
    'Mensagens',
    'Notas internas',
    'Histórico',
    'Identidade',
  ];
}
