import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthApi } from '../features/auth/auth.api';
import { StaffSession } from '../features/auth/staff-session';
import { SessionExpiryBanner } from './session-expiry-banner';

interface NavItem {
  path: string;
  label: string;
}

/** Abaixo desta largura o menu vira gaveta (FR-025: 320 px e zoom de 200%). */
const NARROW = '(max-width: 959.98px)';

/**
 * Área autenticada da equipe (protegida pelo `authGuard`). O menu é derivado das declarações das rotas filhas
 * (`data.nav` e `data.ability`) e das permissões efetivas devolvidas pela API (Q1): o front não copia a matriz de
 * perfis, e a API continua checando cada rota.
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
    SessionExpiryBanner,
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
      <span class="title">Canal de Denúncias · Backoffice</span>
      <button mat-button type="button" (click)="signOut()">Sair</button>
    </mat-toolbar>
    <app-session-expiry-banner (signOut)="signOut()" />
    <mat-sidenav-container class="container">
      <mat-sidenav id="menu-principal" [mode]="narrow() ? 'over' : 'side'" [opened]="!narrow()">
        <mat-nav-list aria-label="Menu">
          @for (item of nav(); track item.path) {
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
    .title {
      flex: 1;
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

  protected readonly session = inject(StaffSession);
  private readonly api = inject(AuthApi);
  private readonly children = inject(ActivatedRoute).routeConfig?.children ?? [];

  protected readonly nav = computed<NavItem[]>(() => {
    // Lido dentro do computed para o menu acompanhar o usuário atual (troca de sessão, perfil retirado).
    this.session.user();
    return this.children
      .filter((route) => typeof route.data?.['nav'] === 'string')
      .filter((route) => {
        const ability = route.data?.['ability'];
        return typeof ability !== 'string' || this.session.can(ability);
      })
      .map((route) => ({ path: route.path ?? '', label: route.data?.['nav'] as string }));
  });

  /** "Sair" (BAUTH-06): pede a saída à API e limpa a sessão no front mesmo se a chamada falhar. */
  protected signOut(): void {
    const end = () => this.session.end('signed-out');
    this.api.signOut().subscribe({ complete: end, error: end });
  }
}
