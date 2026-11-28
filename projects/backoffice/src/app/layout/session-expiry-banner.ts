import { Component, inject, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { StaffSession } from '../features/auth/staff-session';

const TEXTS = {
  idle: 'Sua sessão vai terminar em 1 minuto por falta de uso.',
  absolute: 'Sua sessão vai terminar em 1 minuto (limite de 8 horas). Salve o que estiver fazendo.',
} as const;

/**
 * Faixa de aviso de expiração (BAUTH-06, contracts/auth-routes.md). Não é modal e não move o foco: `role="alert"`
 * anuncia o texto sem tirar a pessoa do que está fazendo. "Continuar" só existe no aviso de inatividade; o limite de 8
 * horas não se renova. "Sair" é tratado pelo `Shell`, o mesmo caminho do botão da barra.
 */
@Component({
  selector: 'app-session-expiry-banner',
  imports: [MatButtonModule],
  template: `
    @let warning = session.warning();
    @if (warning) {
      <div class="banner" role="alert">
        <p>{{ texts[warning] }}</p>
        <div class="actions">
          @if (warning === 'idle') {
            <button mat-flat-button type="button" (click)="continueSession()">Continuar</button>
          }
          <button mat-button type="button" (click)="signOut.emit()">Sair</button>
        </div>
      </div>
    }
  `,
  styles: `
    .banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 1rem;
      padding: 0.75rem max(16px, env(safe-area-inset-left));
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    p {
      margin: 0;
      flex: 1 1 16rem;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
    }
  `,
})
export class SessionExpiryBanner {
  protected readonly session = inject(StaffSession);
  protected readonly texts = TEXTS;
  readonly signOut = output<void>();

  protected continueSession(): void {
    // Um 401 aqui segue para o encerramento normal (errorInterceptor → StaffSession.end).
    this.session.continueSession().catch(() => undefined);
  }
}
