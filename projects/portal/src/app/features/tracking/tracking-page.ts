import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-tracking-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Acompanhamento"
    description="Status, linha do tempo, mensagens com a equipe de apuração e envio de complementos."
  />`,
})
export class TrackingPage {}
