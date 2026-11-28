import { TestBed } from '@angular/core/testing';
import { BACKOFFICE_API_POLICY } from './api-policy';
import { SignInFlow } from './features/auth/sign-in-flow';
import { StaffSession } from './features/auth/staff-session';

describe('BACKOFFICE_API_POLICY', () => {
  it('no 401, encerra a sessão pelo StaffSession, sem a mensagem padrão (R1)', () => {
    const end = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: StaffSession, useValue: { end } }] });

    TestBed.runInInjectionContext(() => BACKOFFICE_API_POLICY.onUnauthenticated());

    expect(end).toHaveBeenCalledWith('unauthenticated');
    expect(BACKOFFICE_API_POLICY.silentUnauthenticated).toBe(true);
  });

  it('403 PASSWORD_CHANGE_REQUIRED leva à troca de senha, sem a mensagem de acesso negado', () => {
    const requirePasswordChange = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: StaffSession, useValue: { requirePasswordChange } }],
    });
    const run = (body: unknown) =>
      TestBed.runInInjectionContext(() => BACKOFFICE_API_POLICY.onForbidden?.(body));
    expect(run({ statusCode: 403, error: 'Forbidden', code: 'PASSWORD_CHANGE_REQUIRED' })).toBe(
      true,
    );
    expect(
      run({
        statusCode: 403,
        message: [{ code: 'PASSWORD_CHANGE_REQUIRED', path: '', message: 'm' }],
      }),
    ).toBe(true);
    expect(requirePasswordChange).toHaveBeenCalledTimes(2);
    expect(run({ statusCode: 403, error: 'Forbidden' })).toBe(false);
    expect(run(null)).toBe(false);
    expect(requirePasswordChange).toHaveBeenCalledTimes(2);
  });

  it('403 STEP_NOT_ALLOWED leva à etapa certa, sem encerrar a sessão nem mostrar mensagem', () => {
    const goToCurrentStep = vi.fn().mockResolvedValue(undefined);
    const end = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: SignInFlow, useValue: { goToCurrentStep } },
        { provide: StaffSession, useValue: { end } },
      ],
    });
    const handled = TestBed.runInInjectionContext(() =>
      BACKOFFICE_API_POLICY.onForbidden?.({ statusCode: 403, code: 'STEP_NOT_ALLOWED' }),
    );
    expect(handled).toBe(true);
    expect(goToCurrentStep).toHaveBeenCalledTimes(1);
    expect(end).not.toHaveBeenCalled();
  });

  it('envia o cookie de sessão e nunca usa token de denunciante', () => {
    expect(BACKOFFICE_API_POLICY).toMatchObject({
      audience: 'backoffice',
      withCredentials: true,
      bearerFor: null,
    });
  });
});
