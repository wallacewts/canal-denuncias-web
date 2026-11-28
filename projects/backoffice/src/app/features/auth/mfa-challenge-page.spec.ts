import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AuthApi } from './auth.api';
import { MfaChallengePage } from './mfa-challenge-page';
import { SignInFlow } from './sign-in-flow';
import { StaffSession } from './staff-session';

describe('MfaChallengePage (BAUTH-02)', () => {
  const challenge = vi.fn();
  const advance = vi.fn().mockResolvedValue(undefined);

  async function render(pendingMs = 5 * 60_000) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login/codigo', component: MfaChallengePage },
          { path: 'login', children: [] },
        ]),
        { provide: AuthApi, useValue: { challenge, signOut: () => of(null) } },
        { provide: SignInFlow, useValue: { advance } },
      ],
    });
    TestBed.inject(StaffSession).startPending(
      'MFA_REQUIRED',
      {
        idleExpiresAt: new Date(Date.now() + pendingMs),
        absoluteExpiresAt: new Date(Date.now() + 3_600_000),
      },
      null,
    );
    const harness = await RouterTestingHarness.create('/login/codigo');
    const el = harness.routeNativeElement as HTMLElement;
    const field = () => el.querySelector('input[formcontrolname="code"]') as HTMLInputElement;
    const type = (value: string) => {
      field().value = value;
      field().dispatchEvent(new Event('input'));
    };
    const submit = async () => {
      el.querySelector('form')?.dispatchEvent(new Event('submit'));
      harness.detectChanges();
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    return { harness, el, field, type, submit };
  }

  beforeEach(() => {
    challenge.mockReset();
    advance.mockClear();
  });

  it('campo de código de uso único, numérico, e envio do código do autenticador', async () => {
    challenge.mockReturnValue(of({ value: { nextStep: 'DONE' }, serverNow: null }));
    const { field, type, submit } = await render();
    expect(field().getAttribute('autocomplete')).toBe('one-time-code');
    expect(field().getAttribute('inputmode')).toBe('numeric');
    type('123456');
    await submit();
    expect(challenge).toHaveBeenCalledWith({ code: '123456' });
    expect(advance).toHaveBeenCalled();
    expect(field().value).toBe('');
  });

  it('código de 5 dígitos não é enviado', async () => {
    const { type, submit } = await render();
    type('12345');
    await submit();
    expect(challenge).not.toHaveBeenCalled();
  });

  it('"Usar um código de recuperação" envia o código de recuperação', async () => {
    challenge.mockReturnValue(of({ value: { nextStep: 'DONE' }, serverNow: null }));
    const { el, harness, type, submit } = await render();
    (el.querySelector('[data-testid="use-recovery"]') as HTMLButtonElement).click();
    harness.detectChanges();
    type('SIMULADA-REC-0001');
    await submit();
    expect(challenge).toHaveBeenCalledWith({ recoveryCode: 'SIMULADA-REC-0001' });
  });

  it('401 mostra mensagem genérica; 423 mostra bloqueio sem motivo', async () => {
    challenge.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const { el, type, submit } = await render();
    type('000000');
    await submit();
    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Código inválido. Confira e tente de novo.',
    );
    challenge.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 423 })));
    type('000000');
    await submit();
    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Muitas tentativas. Aguarde alguns minutos e entre de novo.',
    );
  });

  it('401 com a sessão pendente expirada volta ao login com a mensagem de sessão encerrada', async () => {
    challenge.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const { type, submit } = await render(1);
    await new Promise((r) => setTimeout(r, 5));
    type('000000');
    await submit();
    expect(TestBed.inject(StaffSession).consumeEndReason()).toBe('unauthenticated');
  });
});
