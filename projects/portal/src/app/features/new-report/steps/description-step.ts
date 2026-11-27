import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-description-step',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Relato"
    description="O que aconteceu, quando, onde e como você ficou sabendo."
  />`,
})
export class DescriptionStep {}
