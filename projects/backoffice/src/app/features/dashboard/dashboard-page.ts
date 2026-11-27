import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-dashboard-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Painel"
    description="Volume de denúncias, prazos (SLA), categorias e status."
  />`,
})
export class DashboardPage {}
