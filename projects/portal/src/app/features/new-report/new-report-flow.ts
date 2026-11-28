import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ReceiptState } from './receipt.state';
import { ReportDraftState } from './report-draft.state';

/**
 * Rota-pai `/nova-denuncia` (research.md R3). Fornece o rascunho e o comprovante com escopo de tela: as etapas, a
 * revisão e a tela do protocolo são filhas, e sair do fluxo destrói este componente e descarta os dois estados.
 * Nada é salvo no navegador e nada do relato vai na URL.
 */
@Component({
  selector: 'app-new-report-flow',
  imports: [RouterOutlet],
  providers: [ReportDraftState, ReceiptState],
  template: `<router-outlet />`,
})
export class NewReportFlow {}
