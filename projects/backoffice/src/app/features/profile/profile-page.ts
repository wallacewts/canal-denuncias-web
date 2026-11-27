import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-profile-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Meu perfil"
    description="Senha, aplicativo autenticador e sessões ativas."
  />`,
})
export class ProfilePage {}
