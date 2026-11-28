import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ReporterSession } from '@canal/shared';
import { PORTAL_API_POLICY } from './api-policy';
import { ReporterAccess } from './features/tracking/reporter-access';

describe('PORTAL_API_POLICY', () => {
  it('no 401, encerra o acesso pelo ReporterAccess: limpa a sessão e leva a /consultar sem dados na URL', () => {
    const navigateByUrl = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { navigateByUrl } }],
    });
    const session = TestBed.inject(ReporterSession);
    session.start('token-teste', new Date(Date.now() + 60_000));

    TestBed.runInInjectionContext(() => PORTAL_API_POLICY.onUnauthenticated());

    expect(session.token()).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledWith('/consultar', { replaceUrl: true });
    expect(TestBed.inject(ReporterAccess).consumeEndReason()).toBe('expired');
  });

  it('nunca envia cookies e só manda o token no acompanhamento', () => {
    expect(PORTAL_API_POLICY).toMatchObject({
      audience: 'portal',
      withCredentials: false,
      bearerFor: '/public/v1/me/',
      silentUnauthenticated: true,
    });
  });
});
