import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  Router,
  type RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { of, throwError } from 'rxjs';
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

  const unauthorized = () => throwError(() => new HttpErrorResponse({ status: 401 }));
  const meUser = (passwordChangeRequired: boolean) =>
    of({
      value: {
        id: 'u',
        name: 'P',
        email: 'p@x',
        roles: [],
        mfaEnabledAt: '2026-01-01T00:00:00Z',
        passwordChangeRequired,
        abilities: [],
        ...EXPIRY,
      },
      serverNow: null,
    });

  it('pular etapa pelo endereço leva à etapa certa; sem etapa (e /me 401), ao login', async () => {
    me.mockImplementation(unauthorized);
    expect(str(await guard('MFA_REQUIRED'))).toBe('/login');
    TestBed.inject(StaffSession).startPending('MFA_ENROLLMENT_REQUIRED', EXPIRY, null);
    expect(str(await guard('MFA_REQUIRED'))).toBe('/primeiro-acesso/autenticador');
    expect(await guard('MFA_ENROLLMENT_REQUIRED')).toBe(true);
  });

  it('recarregar na troca de senha exigida depois do segundo fator: o /me restaura a etapa', async () => {
    me.mockImplementation(() => meUser(true));
    expect(await guard('PASSWORD_CHANGE_REQUIRED')).toBe(true);
  });

  it('recarregar numa etapa com a sessão já completa vai ao painel', async () => {
    me.mockImplementation(() => meUser(false));
    expect(str(await guard('PASSWORD_CHANGE_REQUIRED'))).toBe('/painel');
  });

  it('sessão pendente expirada volta ao login', async () => {
    me.mockImplementation(unauthorized);
    TestBed.inject(StaffSession).startPending(
      'MFA_REQUIRED',
      { ...EXPIRY, idleExpiresAt: new Date(Date.now() - 1) },
      null,
    );
    expect(str(await guard('MFA_REQUIRED'))).toBe('/login');
  });

  describe('goToCurrentStep (403 STEP_NOT_ALLOWED)', () => {
    it('sessão completa em memória: vai ao painel sem chamar a API', async () => {
      const session = TestBed.inject(StaffSession);
      vi.spyOn(session, 'authenticated').mockReturnValue(true);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      await TestBed.inject(SignInFlow).goToCurrentStep();
      expect(me).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('/painel', { replaceUrl: true });
    });

    it('etapa já concluída na API (/me completo): entra e vai ao painel', async () => {
      me.mockImplementation(() => meUser(false));
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      TestBed.inject(StaffSession).startPending('MFA_ENROLLMENT_REQUIRED', EXPIRY, null);
      await TestBed.inject(SignInFlow).goToCurrentStep();
      expect(TestBed.inject(StaffSession).authenticated()).toBe(true);
      expect(navigate).toHaveBeenCalledWith('/painel', { replaceUrl: true });
    });

    it('troca de senha exigida: vai à troca', async () => {
      me.mockImplementation(() => meUser(true));
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      await TestBed.inject(SignInFlow).goToCurrentStep();
      expect(navigate).toHaveBeenCalledWith('/primeiro-acesso/senha', { replaceUrl: true });
    });

    it('antes do segundo fator (/me 401): volta à etapa em memória, sem encerrar', async () => {
      me.mockImplementation(unauthorized);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      const session = TestBed.inject(StaffSession);
      session.startPending('MFA_REQUIRED', EXPIRY, null);
      await TestBed.inject(SignInFlow).goToCurrentStep();
      expect(navigate).toHaveBeenCalledWith('/login/codigo', { replaceUrl: true });
      expect(session.consumeEndReason()).toBeNull();
    });
  });

  it('rotas de cada etapa', () => {
    expect(stepRoute('MFA_REQUIRED')).toBe('/login/codigo');
    expect(stepRoute('DONE')).toBe('/painel');
  });
});
