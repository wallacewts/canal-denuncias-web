import { Component, computed, inject } from '@angular/core';
import { ReporterAccess } from './reporter-access';

/**
 * Faixa de expiração (research R6): não modal, para não tirar o foco de quem está digitando. Aparece 2 minutos antes de
 * o acesso terminar e é anunciada uma vez (`role="alert"`). Não há como renovar o acesso (PUB-01).
 */
@Component({
  selector: 'app-expiry-banner',
  template: `
    @if (access.expiringSoon()) {
      <p role="alert" data-testid="expiry-banner" class="banner">{{ text() }}</p>
    }
  `,
  styles: `
    .banner {
      margin: 0;
      padding: 0.75rem 1rem;
      border: 2px solid var(--mat-sys-error);
      border-radius: 8px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      font-weight: 600;
    }
  `,
})
export class ExpiryBanner {
  protected readonly access = inject(ReporterAccess);
  protected readonly text = computed(() => {
    const n = this.access.minutesLeft();
    return `Seu acesso termina em ${n} ${n === 1 ? 'minuto' : 'minutos'}. O texto que você ainda não enviou será perdido.`;
  });
}
