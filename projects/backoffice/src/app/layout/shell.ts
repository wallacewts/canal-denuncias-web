import { Component } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem {
  path: string;
  label: string;
}

/**
 * Área autenticada da equipe. O guard de autenticação entra junto com o módulo auth da API.
 * Os itens visíveis vão depender do perfil (ex.: ADMIN não vê denúncias).
 */
@Component({
  selector: 'app-shell',
  imports: [
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  template: `
    <mat-toolbar>
      <span>Canal de Denúncias · Backoffice</span>
    </mat-toolbar>
    <mat-sidenav-container class="container">
      <mat-sidenav mode="side" opened>
        <mat-nav-list aria-label="Menu">
          @for (item of nav; track item.path) {
            <a
              mat-list-item
              [routerLink]="item.path"
              routerLinkActive
              #rla="routerLinkActive"
              [activated]="rla.isActive"
            >
              {{ item.label }}
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content class="content">
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100dvh;
    }
    .container {
      flex: 1;
    }
    .content {
      padding: 1.5rem;
    }
  `,
})
export class Shell {
  protected readonly nav: NavItem[] = [
    { path: 'painel', label: 'Painel' },
    { path: 'denuncias', label: 'Caixa de denúncias' },
    { path: 'triagem', label: 'Triagem e atribuição' },
    { path: 'relatorios', label: 'Relatórios' },
    { path: 'usuarios', label: 'Usuários e perfis' },
    { path: 'configuracoes', label: 'Configurações' },
    { path: 'auditoria', label: 'Trilha de auditoria' },
    { path: 'perfil', label: 'Meu perfil' },
  ];
}
