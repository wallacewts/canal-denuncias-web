import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-report-inbox-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Caixa de denúncias"
    description="Denúncias atribuídas a você ou, conforme o perfil, todas, com filtros."
  />`,
})
export class ReportInboxPage {}
