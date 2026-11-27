import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-reporting-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Relatórios e exportação"
    description="Indicadores agregados e anonimizados."
  />`,
})
export class ReportingPage {}
