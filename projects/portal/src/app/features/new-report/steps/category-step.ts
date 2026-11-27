import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-category-step',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Categoria"
    description="Vazamento de dados, prática inadequada de segurança ou atividade suspeita."
  />`,
})
export class CategoryStep {}
