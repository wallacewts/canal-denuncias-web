import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthApi } from './auth.api';
import type { CurrentUser } from './auth.types';
import { SESSION_CHANNEL, StaffSession } from './staff-session';

const MIN = 60_000;

function user(now: number, idleMs = 15 * MIN, absoluteMs = 8 * 60 * MIN): CurrentUser {
  return {
    id: 'u',
    name: 'Pessoa',
    email: 'p@x.test',
    roles: ['ANALYST'],
    mfaEnabledAt: null,
    passwordChangeRequired: false,
    abilities: ['reports.list'],
    idleExpiresAt: new Date(now + idleMs),
    absoluteExpiresAt: new Date(now + absoluteMs),
  };
}

describe('StaffSession (R1 a R3)', () => {
  const navigateByUrl = vi.fn().mockResolvedValue(true);
  const me = vi.fn();
  const signOut = vi.fn();
  const posted: unknown[] = [];
  let listener: ((e: MessageEvent) => void) | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-28T12:00:00Z'));
    navigateByUrl.mockClear();
    me.mockReset();
    signOut.mockReset().mockReturnValue(of(undefined));
    posted.length = 0;
    listener = null;
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigateByUrl } },
        { provide: AuthApi, useValue: { me, signOut } },
        {
          provide: SESSION_CHANNEL,
          useValue: {
            postMessage: (m: unknown) => posted.push(m),
            addEventListener: (_t: string, fn: (e: MessageEvent) => void) => (listener = fn),
            close: () => undefined,
          },
        },
      ],
    });
  });
  afterEach(() => vi.useRealTimers());

  const session = () => TestBed.inject(StaffSession);

  it('restaura pelo /me e expõe usuário e permissões só em memória', async () => {
    me.mockReturnValue(of({ value: user(Date.now()), serverNow: Date.now() }));
    expect(await session().restore()).toBe(true);
    expect(me).toHaveBeenCalledWith(true);
    expect(session().user()?.email).toBe('p@x.test');
    expect(session().can('reports.list')).toBe(true);
    expect(session().can('users.manage')).toBe(false);
  });

  it('restauração com troca de senha exigida (/me com passwordChangeRequired): etapa pendente, sem usuário', async () => {
    me.mockReturnValue(
      of({ value: { ...user(Date.now()), passwordChangeRequired: true }, serverNow: Date.now() }),
    );
    const s = session();
    expect(await s.restore()).toBe(false);
    expect(s.user()).toBeNull();
    expect(s.pending()?.step).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(s.pendingExpired()).toBe(false);
  });

  it('403 PASSWORD_CHANGE_REQUIRED no meio do uso: apaga o usuário, descarta respostas e vai à troca de senha', () => {
    const s = session();
    s.establish(user(Date.now()), Date.now());
    const generation = s.generation();
    s.requirePasswordChange();
    expect(s.user()).toBeNull();
    expect(s.isCurrent(generation)).toBe(false);
    expect(s.pending()?.step).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(s.pendingExpired()).toBe(false);
    expect(navigateByUrl).toHaveBeenCalledWith('/primeiro-acesso/senha', { replaceUrl: true });
    // Sem timers de aviso enquanto a troca está pendente.
    vi.advanceTimersByTime(14 * MIN);
    expect(s.warning()).toBeNull();
  });

  it('restauração com 401 devolve falso sem encerrar nem mostrar mensagem', async () => {
    me.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    expect(await session().restore()).toBe(false);
    expect(session().consumeEndReason()).toBeNull();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('end() é idempotente, limpa tudo, avisa as outras abas e vai ao login sem histórico', () => {
    const s = session();
    s.establish(user(Date.now()), Date.now());
    s.rememberReturn('/denuncias');
    s.end('signed-out');
    s.end('signed-out');
    expect(s.user()).toBeNull();
    expect(s.can('reports.list')).toBe(false);
    expect(posted).toEqual([{ type: 'ended', reason: 'signed-out' }]);
    expect(navigateByUrl).toHaveBeenCalledTimes(1);
    expect(navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
    expect(s.consumeEndReason()).toBe('signed-out');
    expect(s.consumeEndReason()).toBeNull();
    expect(s.consumeReturnUrl()).toBe('/painel');
  });

  it('encerramento vindo de outra aba não é reenviado', () => {
    const s = session();
    s.establish(user(Date.now()), Date.now());
    listener?.({ data: { type: 'ended', reason: 'signed-out' } } as MessageEvent);
    expect(s.user()).toBeNull();
    expect(posted).toEqual([]);
    expect(s.consumeEndReason()).toBe('other-tab');
  });

  it('janela de inatividade vem da API (sem 15 min fixo): aviso 1 min antes da margem de 60 s', () => {
    const s = session();
    s.establish(user(Date.now(), 10 * MIN), Date.now());
    vi.advanceTimersByTime(8 * MIN - 1);
    expect(s.warning()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(s.warning()).toBe('idle');
    vi.advanceTimersByTime(MIN);
    expect(s.user()).toBeNull();
    expect(s.consumeEndReason()).toBe('idle');
    expect(signOut).toHaveBeenCalled();
  });

  it('atividade (desta ou de outra aba) adia o aviso de inatividade', () => {
    const s = session();
    s.establish(user(Date.now()), Date.now());
    vi.advanceTimersByTime(12 * MIN);
    s.markActivity();
    expect(posted).toContainEqual({ type: 'activity', at: Date.now() });
    vi.advanceTimersByTime(12 * MIN);
    expect(s.warning()).toBeNull();
    listener?.({ data: { type: 'activity', at: Date.now() } } as MessageEvent);
    vi.advanceTimersByTime(12 * MIN);
    expect(s.warning()).toBeNull();
    expect(s.user()).not.toBeNull();
  });

  it('limite absoluto: aviso sem continuar e encerramento no horário informado', () => {
    const s = session();
    s.establish(user(Date.now(), 15 * MIN, 5 * MIN), Date.now());
    vi.advanceTimersByTime(4 * MIN);
    expect(s.warning()).toBe('absolute');
    s.markActivity();
    expect(s.warning()).toBe('absolute');
    vi.advanceTimersByTime(MIN);
    expect(s.consumeEndReason()).toBe('absolute');
  });

  it('inatividade limitada pelo horário absoluto (API corta idleExpiresAt): vale o aviso absoluto', () => {
    const s = session();
    s.establish(user(Date.now(), 9 * MIN, 9 * MIN), Date.now());
    vi.advanceTimersByTime(7 * MIN);
    expect(s.warning()).toBeNull();
    vi.advanceTimersByTime(MIN);
    expect(s.warning()).toBe('absolute');
    expect(s.consumeEndReason()).toBeNull();
    vi.advanceTimersByTime(MIN);
    expect(s.consumeEndReason()).toBe('absolute');
  });

  it('corrige o relógio local pelo horário do servidor', () => {
    const s = session();
    const serverNow = Date.now() + 10 * MIN; // relógio local 10 min atrasado
    s.establish(user(serverNow, 15 * MIN, 5 * MIN), serverNow);
    vi.advanceTimersByTime(4 * MIN);
    expect(s.warning()).toBe('absolute');
  });

  it('respostas que chegam depois do encerramento são descartadas (isCurrent)', () => {
    const s = session();
    s.establish(user(Date.now()), Date.now());
    const gen = s.generation();
    expect(s.isCurrent(gen)).toBe(true);
    s.end('unauthenticated');
    expect(s.isCurrent(gen)).toBe(false);
  });

  it('caminho de retorno só aceita rotas internas', () => {
    const s = session();
    for (const bad of [
      '//x.example',
      'https://x.example',
      '/login',
      '/primeiro-acesso/senha',
      'painel',
    ]) {
      s.rememberReturn(bad);
      expect(s.consumeReturnUrl()).toBe('/painel');
    }
    s.rememberReturn('/denuncias?pagina=2');
    expect(s.consumeReturnUrl()).toBe('/denuncias?pagina=2');
  });

  it('sessão pendente: etapa em memória e expiração pelo horário da API', () => {
    const s = session();
    s.startPending(
      'MFA_REQUIRED',
      {
        idleExpiresAt: new Date(Date.now() + 5 * MIN),
        absoluteExpiresAt: new Date(Date.now() + 60 * MIN),
      },
      Date.now(),
    );
    expect(s.pending()?.step).toBe('MFA_REQUIRED');
    expect(s.pendingExpired()).toBe(false);
    vi.advanceTimersByTime(5 * MIN);
    expect(s.pendingExpired()).toBe(true);
  });
});
