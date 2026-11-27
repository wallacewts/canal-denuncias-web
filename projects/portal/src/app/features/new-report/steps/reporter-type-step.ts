import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-reporter-type-step',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Quem está relatando"
    description="Colaborador, parceiro ou terceiro. Nenhum dado pessoal é pedido nesta etapa."
  />`,
})
export class ReporterTypeStep {}
