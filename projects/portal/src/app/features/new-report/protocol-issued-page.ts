import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-protocol-issued-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Protocolo gerado"
    description="Guarde o protocolo e a chave agora. A chave é exibida uma única vez e não pode ser recuperada."
  />`,
})
export class ProtocolIssuedPage {}
