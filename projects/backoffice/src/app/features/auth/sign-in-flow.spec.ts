import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  Router,
  type RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';
import { AuthApi } from './auth.api';
import { SignInFlow, stepGuard, stepRoute } from './sign-in-flow';
import { StaffSession } from './staff-session';

const EXPIRY = {
  idleExpiresAt: new Date(Date.now() + 10 * 60_000),
  absoluteExpiresAt: new Date(Date.now() + 8 * 3_600_000),
};

describe('SignInFlow e stepGuard (R5)', () => {
  const me = vi.fn();

  beforeEach(() => {
    me.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthApi, useValue: { me, signOut: () => of(null) } },
      ],
    });
  });

  const str = (r: unknown) => (r instanceof UrlTree ? TestBed.inject(Router).serializeUrl(r) : r);
  const guard = (step: Parameters<typeof stepGuard>[0]) =>
    TestBed.runInInjectionContext(() =>
      stepGuard(step)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  it('a etapa vinda da API decide a rota', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await TestBed.inject(SignInFlow).advance({
      value: { nextStep: 'PASSWORD_CHANGE_REQUIRED', ...EXPIRY },
      serverNow: null,
    });
    expect(navigate).toHaveBeenCalledWith('/primeiro-acesso/senha', { replaceUrl: true });
    expect(TestBed.inject(StaffSession).pending()?.step).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('DONE carrega o /me e vai para o caminho de retorno', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    me.mockReturnValue(
      of({
        value: {
          id: 'u',
          name: 'P',
          email: 'p@x',
          roles: [],
          mfaEnabledAt: null,
          passwordChangeRequired: false,
          abilities: [],
          ...EXPIRY,
        },
        serverNow: null,
      }),
    );
    TestBed.inject(StaffSession).rememberReturn('/denuncias');
    await TestBed.inject(SignInFlow).advance({
      value: { nextStep: 'DONE', ...EXPIRY },
      serverNow: null,
    });
    expect(TestBed.inject(StaffSession).authenticated()).toBe(true);
    expect(navigate).toHaveBeenLastCalledWith('/denuncias', { replaceUrl: true });
  });

  it('pular etapa pelo endereço leva à etapa certa; sem etapa, ao login', () => {
    expect(str(guard('MFA_REQUIRED'))).toBe('/login');
    TestBed.inject(StaffSession).startPending('MFA_ENROLLMENT_REQUIRED', EXPIRY, null);
    expect(str(guard('MFA_REQUIRED'))).toBe('/primeiro-acesso/autenticador');
    expect(guard('MFA_ENROLLMENT_REQUIRED')).toBe(true);
  });

  it('sessão pendente expirada volta ao login', () => {
    TestBed.inject(StaffSession).startPending(
      'MFA_REQUIRED',
      { ...EXPIRY, idleExpiresAt: new Date(Date.now() - 1) },
      null,
    );
    expect(str(guard('MFA_REQUIRED'))).toBe('/login');
  });

  it('rotas de cada etapa', () => {
    expect(stepRoute('MFA_REQUIRED')).toBe('/login/codigo');
    expect(stepRoute('DONE')).toBe('/painel');
  });
});
