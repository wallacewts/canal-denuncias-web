import {
  Injectable,
  InjectionToken,
  type OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from './auth.api';
import type { PendingStep, ProvisionalCurrentUser, SessionExpiry } from './auth.types';

export type EndReason = 'signed-out' | 'idle' | 'absolute' | 'unauthenticated' | 'other-tab';
export type SessionWarning = 'idle' | 'absolute';

/** Aviso 1 minuto antes de cada expiração (BAUTH-06). */
const WARN_BEFORE_MS = 60_000;
/** A API grava o último uso no máximo uma vez por minuto (`touchInterval`, AUTH-02): margem de 60 s (R3). */
const IDLE_MARGIN_MS = 60_000;
const DEFAULT_RETURN = '/painel';

/** Canal entre abas: só eventos, nunca dados (R2). Não é armazenamento do navegador. */
export interface SessionChannel {
  postMessage(message: SessionMessage): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  close(): void;
}
export type SessionMessage =
  { type: 'activity'; at: number } | { type: 'ended'; reason: EndReason };

export const SESSION_CHANNEL = new InjectionToken<SessionChannel | null>('SESSION_CHANNEL', {
  providedIn: 'root',
  factory: () =>
    typeof BroadcastChannel === 'function'
      ? (new BroadcastChannel('canal-backoffice-session') as unknown as SessionChannel)
      : null,
});

/** Caminho de retorno aceito: só rotas internas do backoffice, fora do fluxo de entrada (R4). */
export function isInternalReturn(url: string): boolean {
  return (
    url.startsWith('/') &&
    !url.startsWith('//') &&
    !url.includes('\\') &&
    !/^\/(login|primeiro-acesso|acesso-negado)(\/|\?|#|$)/.test(url)
  );
}

/**
 * Sessão da equipe no front (research R1 a R3). Guarda só em memória o usuário atual, as permissões efetivas e os
 * horários de expiração informados pela API; nenhum token (a sessão é o cookie HttpOnly da API, D53). É o único ponto de
 * encerramento: expiração por inatividade, limite absoluto, 401, "Sair" e saída em outra aba passam por `end()`, que
 * limpa a memória, avisa as outras abas e vai ao login sem histórico. O motivo é lido uma vez pela tela de login.
 */
@Injectable({ providedIn: 'root' })
export class StaffSession implements OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(AuthApi);
  private readonly channel = inject(SESSION_CHANNEL);

  private readonly userState = signal<ProvisionalCurrentUser | null>(null);
  private readonly pendingState = signal<{ step: PendingStep; expiresAtLocal: number } | null>(
    null,
  );
  private readonly warningState = signal<SessionWarning | null>(null);
  private readonly generationState = signal(0);

  readonly user = this.userState.asReadonly();
  readonly pending = this.pendingState.asReadonly();
  readonly warning = this.warningState.asReadonly();
  readonly generation = this.generationState.asReadonly();
  readonly authenticated = computed(() => this.userState() !== null);
  private readonly abilities = computed(() => new Set(this.userState()?.abilities ?? []));

  private live = false;
  private endReason: EndReason | null = null;
  private returnUrl: string | null = null;
  private idleWindowMs: number | null = null;
  private absoluteAtLocal: number | null = null;
  private lastActivityLocal = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.channel?.addEventListener('message', (event) => this.onMessage(event.data));
  }

  can(ability: string): boolean {
    return this.abilities().has(ability);
  }

  /** Verdadeiro só se a resposta pertence à sessão ainda aberta (respostas atrasadas são descartadas). */
  isCurrent(generation: number): boolean {
    return this.live && generation === this.generationState();
  }

  /** Login feito, falta uma etapa (troca de senha, cadastro ou desafio do segundo fator). */
  startPending(step: PendingStep, expiry: SessionExpiry, serverNow: number | null): void {
    this.live = true;
    this.endReason = null;
    this.pendingState.set({ step, expiresAtLocal: this.toLocal(expiry.idleExpiresAt, serverNow) });
  }

  /** Etapa já concluída do lado da API (ex.: códigos de recuperação exibidos antes de entrar). */
  clearPending(): void {
    this.pendingState.set(null);
  }

  pendingExpired(): boolean {
    const pending = this.pendingState();
    return !pending || Date.now() >= pending.expiresAtLocal;
  }

  /** Sessão verificada: usuário e horários vindos de `/me`. */
  establish(user: ProvisionalCurrentUser, serverNow: number | null): void {
    this.live = true;
    this.endReason = null;
    this.pendingState.set(null);
    this.userState.set(user);
    this.warningState.set(null);
    const skew = serverNow === null ? 0 : serverNow - Date.now();
    const reference = serverNow ?? Date.now();
    this.idleWindowMs = Math.max(0, user.idleExpiresAt.getTime() - reference);
    this.absoluteAtLocal = user.absoluteExpiresAt.getTime() - skew;
    this.lastActivityLocal = Date.now();
    this.reschedule();
  }

  /** Restaura a sessão ao recarregar: o cookie continua válido no servidor, a memória não (R1). */
  async restore(): Promise<boolean> {
    if (this.userState()) return true;
    try {
      const { value, serverNow } = await firstValueFrom(this.api.me(true));
      this.establish(value, serverNow);
      return true;
    } catch {
      return false;
    }
  }

  /** "Continuar" do aviso de inatividade: uma chamada a `/me`, por ação da pessoa (USERS-07). */
  async continueSession(): Promise<void> {
    const generation = this.generationState();
    const { value, serverNow } = await firstValueFrom(this.api.me());
    if (this.isCurrent(generation)) this.establish(value, serverNow);
  }

  /** Chamada administrativa bem-sucedida (desta aba ou de outra): adia o aviso de inatividade. */
  markActivity(broadcast = true): void {
    if (!this.userState()) return;
    this.lastActivityLocal = Date.now();
    if (this.warningState() === 'idle') this.warningState.set(null);
    this.reschedule();
    if (broadcast) this.channel?.postMessage({ type: 'activity', at: this.lastActivityLocal });
  }

  rememberReturn(url: string): void {
    this.returnUrl = isInternalReturn(url) ? url : null;
  }

  consumeReturnUrl(): string {
    const url = this.returnUrl ?? DEFAULT_RETURN;
    this.returnUrl = null;
    return url;
  }

  consumeEndReason(): EndReason | null {
    const reason = this.endReason;
    this.endReason = null;
    return reason;
  }

  end(reason: EndReason): void {
    if (!this.live) return;
    this.live = false;
    this.cancelTimer();
    this.generationState.update((g) => g + 1);
    this.userState.set(null);
    this.pendingState.set(null);
    this.warningState.set(null);
    this.idleWindowMs = null;
    this.absoluteAtLocal = null;
    this.returnUrl = null;
    this.endReason = reason;
    if (reason !== 'other-tab') this.channel?.postMessage({ type: 'ended', reason });
    // Encerrada pelo relógio do front: a sessão ainda pode estar viva no servidor (margem de 60 s). Sair na API impede
    // que outra pessoa a restaure recarregando a página.
    if (reason === 'idle' || reason === 'absolute')
      this.api.signOut().subscribe({ error: () => undefined });
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  ngOnDestroy(): void {
    this.cancelTimer();
    this.channel?.close();
  }

  private onMessage(message: unknown): void {
    const m = message as Partial<SessionMessage> | null;
    if (m?.type === 'activity') this.markActivity(false);
    else if (m?.type === 'ended') this.end('other-tab');
  }

  private toLocal(serverTime: Date, serverNow: number | null): number {
    const skew = serverNow === null ? 0 : serverNow - Date.now();
    return serverTime.getTime() - skew;
  }

  private reschedule(): void {
    this.cancelTimer();
    if (!this.userState() || this.idleWindowMs === null || this.absoluteAtLocal === null) return;
    const now = Date.now();
    const idleEnd = this.lastActivityLocal + this.idleWindowMs - IDLE_MARGIN_MS;
    const absoluteEnd = this.absoluteAtLocal;
    if (now >= absoluteEnd) return this.end('absolute');
    if (now >= idleEnd) return this.end('idle');
    const absoluteWarn = absoluteEnd - WARN_BEFORE_MS;
    const idleWarn = idleEnd - WARN_BEFORE_MS;
    if (now >= absoluteWarn) this.warningState.set('absolute');
    else if (now >= idleWarn) this.warningState.set('idle');
    else this.warningState.set(null);
    const next = Math.min(...[idleWarn, idleEnd, absoluteWarn, absoluteEnd].filter((t) => t > now));
    this.timer = setTimeout(() => this.reschedule(), next - now);
  }

  private cancelTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
