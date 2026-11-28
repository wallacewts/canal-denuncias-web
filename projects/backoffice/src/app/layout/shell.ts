import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

interface NavItem {
  path: string;
  label: string;
}

/** Abaixo desta largura o menu vira gaveta (FR-025: 320 px e zoom de 200%). */
const NARROW = '(max-width: 959.98px)';

/**
 * Área autenticada da equipe. O guard de autenticação entra junto com o módulo auth da API.
 * Os itens visíveis vão depender do perfil (ex.: ADMIN não vê denúncias).
 */
@Component({
  selector: 'app-shell',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  template: `
    <mat-toolbar class="toolbar">
      @if (narrow()) {
        <button
          mat-icon-button
          type="button"
          aria-label="Menu"
          aria-controls="menu-principal"
          [attr.aria-expanded]="sidenav().opened"
          (click)="sidenav().toggle()"
        >
          <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">menu</mat-icon>
        </button>
      }
      <span>Canal de Denúncias · Backoffice</span>
    </mat-toolbar>
    <mat-sidenav-container class="container">
      <mat-sidenav id="menu-principal" [mode]="narrow() ? 'over' : 'side'" [opened]="!narrow()">
        <mat-nav-list aria-label="Menu">
          @for (item of nav; track item.path) {
            <a
              mat-list-item
              [routerLink]="item.path"
              routerLinkActive
              #rla="routerLinkActive"
              [activated]="rla.isActive"
              (click)="narrow() && sidenav().close()"
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
    .toolbar {
      flex-wrap: wrap;
      height: auto;
      min-height: var(--mat-toolbar-standard-height, 64px);
      white-space: normal;
    }
    .container {
      flex: 1;
    }
    .content {
      padding: 1.5rem max(16px, env(safe-area-inset-left));
    }
  `,
})
export class Shell {
  protected readonly sidenav = viewChild.required(MatSidenav);
  protected readonly narrow = toSignal(
    inject(BreakpointObserver)
      .observe(NARROW)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

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
