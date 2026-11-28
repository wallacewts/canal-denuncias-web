import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { PageHeader } from '@canal/shared';

/** Acesso negado (FR-014): não carrega a tela pedida nem nenhum dado dela. */
@Component({
  selector: 'app-access-denied',
  imports: [PageHeader, RouterLink, MatButtonModule],
  template: `
    <lib-page-header
      title="Acesso negado"
      subtitle="Seu perfil não permite abrir esta tela. Se precisar dela, fale com a administração do canal."
    />
    <a mat-flat-button routerLink="/painel">Ir para o painel</a>
  `,
})
export class AccessDenied {}
