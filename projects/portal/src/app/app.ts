import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [MatButtonModule, MatToolbarModule, RouterLink, RouterOutlet],
  template: `
    <mat-toolbar>
      <a class="brand" routerLink="/">Canal de Denúncias</a>
      <span class="spacer"></span>
      <nav aria-label="Principal" class="nav">
        <a mat-button routerLink="/nova-denuncia">Nova denúncia</a>
        <a mat-button routerLink="/consultar">Consultar</a>
        <a mat-button routerLink="/ajuda">Ajuda</a>
      </nav>
    </mat-toolbar>
    <main class="content">
      <router-outlet />
    </main>
    <footer class="footer">
      <a routerLink="/privacidade">Aviso de privacidade</a>
      <span>Este canal não usa cookies de rastreamento nem registra o seu IP.</span>
    </footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }
    .brand {
      color: inherit;
      text-decoration: none;
      font-weight: 500;
    }
    .spacer {
      flex: 1;
    }
    .nav {
      display: flex;
      flex-wrap: wrap;
    }
    .content {
      flex: 1;
      padding: 1.5rem max(16px, env(safe-area-inset-left));
    }
    .footer {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.5rem;
      padding: 1rem max(16px, env(safe-area-inset-left));
      font-size: 0.875rem;
    }
  `,
})
export class App {}
