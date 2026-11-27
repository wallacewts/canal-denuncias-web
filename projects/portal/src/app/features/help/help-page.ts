import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-help-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Ajuda"
    description="Perguntas frequentes sobre o canal, o anonimato e o andamento das denúncias."
  />`,
})
export class HelpPage {}
