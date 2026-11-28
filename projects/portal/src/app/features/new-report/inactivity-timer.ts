import { DOCUMENT, Injectable, InjectionToken, type OnDestroy, inject } from '@angular/core';

export interface InactivityTiming {
  readonly warnAfterMs: number;
  readonly discardAfterMs: number;
}

/** 25 minutos para o aviso e 30 para o descarte (decisão do usuário, Q1 da spec). Injetável para os testes. */
export const INACTIVITY_TIMING = new InjectionToken<InactivityTiming>('INACTIVITY_TIMING', {
  factory: () => ({ warnAfterMs: 25 * 60_000, discardAfterMs: 30 * 60_000 }),
});

export interface InactivityHandlers {
  warn(): void;
  discard(): void;
}

const ACTIVITY_EVENTS = ['keydown', 'pointerdown'] as const;

/**
 * Descarte por inatividade (FR-009, research.md R8), com escopo do fluxo de envio. Conta atividade por teclado,
 * ponteiro e navegação (o fluxo chama `reset()`), sem guardar o que foi digitado. Depois do aviso, só uma escolha
 * explícita ("Continuar" chama `reset()`) reinicia a contagem.
 */
@Injectable()
export class InactivityTimer implements OnDestroy {
  private readonly timing = inject(INACTIVITY_TIMING);
  private readonly document = inject(DOCUMENT);
  private handlers: InactivityHandlers | null = null;
  private warnTimer: ReturnType<typeof setTimeout> | undefined;
  private discardTimer: ReturnType<typeof setTimeout> | undefined;
  private warned = false;
  private readonly onActivity = () => {
    if (!this.warned) this.arm();
  };

  start(handlers: InactivityHandlers): void {
    this.handlers = handlers;
    for (const type of ACTIVITY_EVENTS) {
      this.document.addEventListener(type, this.onActivity, { passive: true, capture: true });
    }
    this.arm();
  }

  /** Reinicia a contagem inteira (navegação no fluxo ou "Continuar" no aviso). */
  reset(): void {
    if (this.handlers) this.arm();
  }

  private arm(): void {
    this.clearTimers();
    this.warned = false;
    this.warnTimer = setTimeout(() => {
      this.warned = true;
      this.handlers?.warn();
    }, this.timing.warnAfterMs);
    this.discardTimer = setTimeout(() => this.handlers?.discard(), this.timing.discardAfterMs);
  }

  private clearTimers(): void {
    clearTimeout(this.warnTimer);
    clearTimeout(this.discardTimer);
  }

  ngOnDestroy(): void {
    this.clearTimers();
    for (const type of ACTIVITY_EVENTS) {
      this.document.removeEventListener(type, this.onActivity, { capture: true });
    }
    this.handlers = null;
  }
}
