import { DOCUMENT } from '@angular/common';
import { Injectable, type OnDestroy, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReporterSession } from '@canal/shared';

export type EndReason = 'expired' | 'logout';
type EndCause = EndReason | 'unauthorized';

const WARN_BEFORE_MS = 2 * 60_000;
const TICK_MS = 15_000;

/**
 * Ciclo de vida do acesso do denunciante (research R3 e R5). Único ponto de encerramento: expirar (15 min), receber
 * 401, clicar em "Sair" ou a página voltar do cache de navegação apagam a credencial, cancelam os temporizadores e
 * levam à consulta com `replaceUrl`. A credencial fica só na `ReporterSession` (memória); este serviço nunca guarda o
 * andamento nem as mensagens. O motivo do encerramento é lido uma vez pela tela de consulta (único mecanismo de
 * mensagem, analyze I3).
 */
@Injectable({ providedIn: 'root' })
export class ReporterAccess implements OnDestroy {
  private readonly session = inject(ReporterSession);
  private readonly router = inject(Router);
  private readonly window = inject(DOCUMENT).defaultView;

  private readonly expiringState = signal(false);
  private readonly minutesState = signal(0);
  private readonly generationState = signal(0);
  private endReason: EndReason | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private tick: ReturnType<typeof setInterval> | null = null;

  readonly active = computed(() => this.session.token() !== null);
  readonly expiringSoon = this.expiringState.asReadonly();
  readonly minutesLeft = this.minutesState.asReadonly();
  readonly generation = this.generationState.asReadonly();

  private readonly onPageShow = (event: Event) => {
    if ((event as PageTransitionEvent).persisted && this.active()) this.end('unauthorized');
  };

  constructor() {
    this.window?.addEventListener('pageshow', this.onPageShow);
  }

  open(token: string, expiresAt: Date): void {
    this.cancelTimers();
    this.endReason = null;
    this.generationState.update((g) => g + 1);
    this.session.start(token, expiresAt);
    const remaining = expiresAt.getTime() - Date.now();
    this.timers.push(
      setTimeout(() => this.startWarning(expiresAt), Math.max(0, remaining - WARN_BEFORE_MS)),
      setTimeout(() => this.end('expired'), Math.max(0, remaining)),
    );
    if (remaining <= WARN_BEFORE_MS) this.startWarning(expiresAt);
  }

  /** Verdadeiro só se a resposta pertence ao acesso ainda aberto (analyze C1). */
  isCurrent(generation: number): boolean {
    return this.active() && generation === this.generationState();
  }

  end(cause: EndCause): void {
    if (!this.active()) return;
    this.cancelTimers();
    this.session.clear();
    this.expiringState.set(false);
    this.generationState.update((g) => g + 1);
    this.endReason = cause === 'logout' ? 'logout' : 'expired';
    void this.router.navigateByUrl('/consultar', { replaceUrl: true });
  }

  /** Lê o motivo do último encerramento uma única vez. */
  consumeEndReason(): EndReason | null {
    const reason = this.endReason;
    this.endReason = null;
    return reason;
  }

  ngOnDestroy(): void {
    this.cancelTimers();
    this.window?.removeEventListener('pageshow', this.onPageShow);
  }

  private startWarning(expiresAt: Date): void {
    if (this.expiringState()) return;
    const update = () =>
      this.minutesState.set(Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 60_000)));
    update();
    this.expiringState.set(true);
    this.tick = setInterval(update, TICK_MS);
  }

  private cancelTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (this.tick) clearInterval(this.tick);
    this.tick = null;
  }
}
