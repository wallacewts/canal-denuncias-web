import { TestBed } from '@angular/core/testing';
import { BACKOFFICE_API_POLICY } from './api-policy';
import { StaffSession } from './features/auth/staff-session';

describe('BACKOFFICE_API_POLICY', () => {
  it('no 401, encerra a sessão pelo StaffSession, sem a mensagem padrão (R1)', () => {
    const end = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: StaffSession, useValue: { end } }] });

    TestBed.runInInjectionContext(() => BACKOFFICE_API_POLICY.onUnauthenticated());

    expect(end).toHaveBeenCalledWith('unauthenticated');
    expect(BACKOFFICE_API_POLICY.silentUnauthenticated).toBe(true);
  });

  it('envia o cookie de sessão e nunca usa token de denunciante', () => {
    expect(BACKOFFICE_API_POLICY).toMatchObject({
      audience: 'backoffice',
      withCredentials: true,
      bearerFor: null,
    });
  });
});
