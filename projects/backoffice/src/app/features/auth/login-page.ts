import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-login-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Entrar"
    description="Senha e código do aplicativo autenticador. No primeiro acesso, cadastro do MFA."
  />`,
})
export class LoginPage {}
