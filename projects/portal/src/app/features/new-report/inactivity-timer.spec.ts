import { TestBed } from '@angular/core/testing';
import { INACTIVITY_TIMING, InactivityTimer } from './inactivity-timer';

describe('InactivityTimer', () => {
  let timer: InactivityTimer;
  const warn = vi.fn();
  const discard = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    warn.mockReset();
    discard.mockReset();
    TestBed.configureTestingModule({
      providers: [
        InactivityTimer,
        { provide: INACTIVITY_TIMING, useValue: { warnAfterMs: 25_000, discardAfterMs: 30_000 } },
      ],
    });
    timer = TestBed.inject(InactivityTimer);
    timer.start({ warn, discard });
  });

  afterEach(() => {
    timer.ngOnDestroy();
    vi.useRealTimers();
  });

  const press = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

  it('avisa aos 25 e descarta aos 30 sem atividade', () => {
    vi.advanceTimersByTime(24_999);
    expect(warn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(warn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5_000);
    expect(discard).toHaveBeenCalledTimes(1);
  });

  it('atividade por teclado ou ponteiro reinicia a contagem antes do aviso', () => {
    vi.advanceTimersByTime(20_000);
    press();
    vi.advanceTimersByTime(20_000);
    document.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(24_000);
    expect(warn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('depois do aviso, só "Continuar" (reset) reinicia; outra atividade não adia o descarte', () => {
    vi.advanceTimersByTime(25_000);
    press();
    vi.advanceTimersByTime(5_000);
    expect(discard).toHaveBeenCalledTimes(1);
  });

  it('reset depois do aviso reinicia a contagem inteira', () => {
    vi.advanceTimersByTime(25_000);
    timer.reset();
    vi.advanceTimersByTime(24_999);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(discard).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('não guarda o que foi digitado: só registra que houve atividade', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }));
    const stored = Object.values(timer as unknown as Record<string, unknown>);
    expect(stored).not.toContain('S');
    expect(stored.some((v) => v instanceof KeyboardEvent)).toBe(false);
  });

  it('ao destruir, limpa os timers e para de ouvir', () => {
    timer.ngOnDestroy();
    vi.advanceTimersByTime(60_000);
    expect(warn).not.toHaveBeenCalled();
    expect(discard).not.toHaveBeenCalled();
  });
});
