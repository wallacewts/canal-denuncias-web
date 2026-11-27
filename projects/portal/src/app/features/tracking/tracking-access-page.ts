import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-tracking-access-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Consultar denúncia"
    description="Informe o protocolo e a chave recebidos no envio."
  />`,
})
export class TrackingAccessPage {}
