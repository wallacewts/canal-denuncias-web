import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BACKOFFICE_API_POLICY } from './api-policy';

describe('BACKOFFICE_API_POLICY', () => {
  it('no 401, leva ao login', () => {
    const navigateByUrl = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { navigateByUrl } }],
    });

    TestBed.runInInjectionContext(() => BACKOFFICE_API_POLICY.onUnauthenticated());

    expect(navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('envia o cookie de sessão e nunca usa token de denunciante', () => {
    expect(BACKOFFICE_API_POLICY).toMatchObject({
      audience: 'backoffice',
      withCredentials: true,
      bearerFor: null,
    });
  });
});
