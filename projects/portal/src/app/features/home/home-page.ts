import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-home-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Canal de Denúncias"
    description="O que é o canal, que tipos de relato ele recebe e como o seu anonimato é protegido."
  />`,
})
export class HomePage {}
