import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-review-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Revisão e envio"
    description="Confira o relato antes de enviar."
  />`,
})
export class ReviewPage {}
