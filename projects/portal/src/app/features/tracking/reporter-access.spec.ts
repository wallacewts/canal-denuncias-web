import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ReporterSession } from '@canal/shared';
import { ReporterAccess } from './reporter-access';

describe('ReporterAccess (ciclo de vida do acesso do denunciante)', () => {
  let access: ReporterAccess;
  let session: ReporterSession;
  let navigate: ReturnType<typeof vi.spyOn>;
  const NOW = new Date('2026-11-28T12:00:00.000Z');
  const in15 = () => new Date(Date.now() + 15 * 60_000);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    access = TestBed.inject(ReporterAccess);
    session = TestBed.inject(ReporterSession);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    access.ngOnDestroy();
    vi.useRealTimers();
  });

  it('abrir guarda token e expiração na sessão do denunciante', () => {
    access.open('t', in15());
    expect(session.token()).toBe('t');
    expect(session.expiresAt()).toEqual(in15());
    expect(access.active()).toBe(true);
    expect(access.expiringSoon()).toBe(false);
  });

  it('avisa 2 minutos antes e encerra aos 15, com a mensagem de acesso terminado', () => {
    access.open('t', in15());
    vi.advanceTimersByTime(13 * 60_000 - 1);
    expect(access.expiringSoon()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(access.expiringSoon()).toBe(true);
    expect(access.minutesLeft()).toBe(2);
    vi.advanceTimersByTime(2 * 60_000);
    expect(session.token()).toBeNull();
    expect(access.active()).toBe(false);
    expect(access.expiringSoon()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/consultar', { replaceUrl: true });
    expect(access.consumeEndReason()).toBe('expired');
  });

  it('com menos de 2 minutos restantes, o aviso aparece na hora', () => {
    access.open('t', new Date(Date.now() + 60_000));
    expect(access.expiringSoon()).toBe(true);
    expect(access.minutesLeft()).toBe(1);
  });

  it.each([
    ['logout', 'logout'],
    ['unauthorized', 'expired'],
  ] as const)(
    'encerrar por %s limpa tudo, navega com replaceUrl e registra o motivo',
    (reason, expected) => {
      access.open('t', in15());
      access.end(reason);
      expect(session.token()).toBeNull();
      expect(navigate).toHaveBeenCalledWith('/consultar', { replaceUrl: true });
      expect(access.consumeEndReason()).toBe(expected);
      expect(access.consumeEndReason()).toBeNull();
      vi.advanceTimersByTime(20 * 60_000);
      expect(navigate).toHaveBeenCalledTimes(1);
    },
  );

  it('dois encerramentos seguidos não repetem a navegação nem trocam o motivo', () => {
    access.open('t', in15());
    access.end('logout');
    access.end('unauthorized');
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(access.consumeEndReason()).toBe('logout');
  });

  it('resposta de outra geração de acesso é descartada', () => {
    access.open('t', in15());
    const generation = access.generation();
    expect(access.isCurrent(generation)).toBe(true);
    access.end('logout');
    expect(access.isCurrent(generation)).toBe(false);
    access.open('t2', in15());
    expect(access.isCurrent(generation)).toBe(false);
  });

  it('página restaurada do cache de navegação (pageshow persistido) encerra o acesso', () => {
    access.open('t', in15());
    const event = new Event('pageshow') as PageTransitionEvent;
    Object.defineProperty(event, 'persisted', { value: true });
    window.dispatchEvent(event);
    expect(session.token()).toBeNull();
    expect(access.consumeEndReason()).toBe('expired');
  });

  it('pageshow sem persisted não encerra', () => {
    access.open('t', in15());
    window.dispatchEvent(new Event('pageshow'));
    expect(session.token()).toBe('t');
  });
});
