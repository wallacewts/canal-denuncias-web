import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-triage-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Triagem e atribuição"
    description="Classificação, prioridade, atribuição a analistas e bloqueio por conflito de interesse."
  />`,
})
export class TriagePage {}
