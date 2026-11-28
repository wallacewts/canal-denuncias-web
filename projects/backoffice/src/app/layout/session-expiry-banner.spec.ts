import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StaffSession, type SessionWarning } from '../features/auth/staff-session';
import { SessionExpiryBanner } from './session-expiry-banner';

describe('SessionExpiryBanner (BAUTH-06)', () => {
  function render(initial: SessionWarning | null) {
    const warning = signal<SessionWarning | null>(initial);
    const continueSession = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: StaffSession, useValue: { warning, continueSession } }],
    });
    const fixture = TestBed.createComponent(SessionExpiryBanner);
    const signOut = vi.fn();
    fixture.componentInstance.signOut.subscribe(signOut);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = () => [...el.querySelectorAll('button')].map((b) => b.textContent?.trim());
    const click = (name: string) =>
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === name)?.click();
    return { fixture, el, warning, continueSession, signOut, buttons, click };
  }

  it('sem aviso não mostra nada', () => {
    const { el } = render(null);
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('inatividade: texto, role="alert", Continuar e Sair', () => {
    const { el, buttons } = render('idle');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Sua sessão vai terminar em 1 minuto por falta de uso.',
    );
    expect(buttons()).toEqual(['Continuar', 'Sair']);
  });

  it('limite absoluto: texto próprio e só Sair', () => {
    const { el, buttons } = render('absolute');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Sua sessão vai terminar em 1 minuto (limite de 8 horas). Salve o que estiver fazendo.',
    );
    expect(buttons()).toEqual(['Sair']);
  });

  it('Continuar chama a sessão; Sair avisa o Shell', () => {
    const { continueSession, signOut, click } = render('idle');
    click('Continuar');
    expect(continueSession).toHaveBeenCalledTimes(1);
    click('Sair');
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('não rouba o foco quando o aviso aparece', async () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    const { fixture, warning } = render(null);
    warning.set('idle');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(input);
    input.remove();
  });
});
