import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-involved-step',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Envolvidos e sistemas afetados"
    description="Pessoas, áreas, sistemas e tipos de dado envolvidos, se você souber."
  />`,
})
export class InvolvedStep {}
