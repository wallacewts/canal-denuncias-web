import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-users-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Usuários e perfis"
    description="Equipe interna, perfis de acesso e situação das contas."
  />`,
})
export class UsersPage {}
