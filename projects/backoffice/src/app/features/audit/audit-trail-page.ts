import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-audit-trail-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Trilha de auditoria"
    description="Quem acessou o quê e quando, com verificação de integridade da cadeia."
  />`,
})
export class AuditTrailPage {}
