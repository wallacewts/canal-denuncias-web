import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-identification-step',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Identificação (opcional)"
    description="Você pode continuar anônimo. Se quiser se identificar, sua identidade fica lacrada e separada do relato."
  />`,
})
export class IdentificationStep {}
