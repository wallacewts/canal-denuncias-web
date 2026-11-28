import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  Router,
  type RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { authGuard, permissionGuard } from './auth.guards';
import { StaffSession } from './staff-session';

describe('guards (R4, FR-011 a FR-014)', () => {
  const fake = {
    authenticated: vi.fn(),
    restore: vi.fn(),
    pending: vi.fn(),
    pendingExpired: vi.fn(),
    rememberReturn: vi.fn(),
    can: vi.fn(),
  };

  beforeEach(() => {
    Object.values(fake).forEach((f) => f.mockReset());
    fake.pending.mockReturnValue(null);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: StaffSession, useValue: fake }],
    });
  });

  const run = (url: string) =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  const str = (r: unknown) => (r instanceof UrlTree ? TestBed.inject(Router).serializeUrl(r) : r);

  it('sem sessão: vai ao login e guarda o retorno só em memória (nunca na URL)', async () => {
    fake.authenticated.mockReturnValue(false);
    fake.restore.mockResolvedValue(false);
    expect(str(await run('/denuncias'))).toBe('/login');
    expect(fake.rememberReturn).toHaveBeenCalledWith('/denuncias');
  });

  it('sessão viva no servidor é restaurada pelo /me ao recarregar', async () => {
    fake.authenticated.mockReturnValue(false);
    fake.restore.mockResolvedValue(true);
    expect(await run('/denuncias')).toBe(true);
  });

  it('já autenticado passa sem chamar a API', async () => {
    fake.authenticated.mockReturnValue(true);
    expect(await run('/painel')).toBe(true);
    expect(fake.restore).not.toHaveBeenCalled();
  });

  it('restauração que revela troca de senha exigida leva à troca e guarda o retorno', async () => {
    fake.authenticated.mockReturnValue(false);
    fake.restore.mockImplementation(async () => {
      fake.pending.mockReturnValue({ step: 'PASSWORD_CHANGE_REQUIRED' });
      return false;
    });
    fake.pendingExpired.mockReturnValue(false);
    expect(str(await run('/denuncias'))).toBe('/primeiro-acesso/senha');
    expect(fake.rememberReturn).toHaveBeenCalledWith('/denuncias');
  });

  it('etapa pendente em memória leva à etapa (FR-012)', async () => {
    fake.authenticated.mockReturnValue(false);
    fake.pending.mockReturnValue({ step: 'PASSWORD_CHANGE_REQUIRED' });
    fake.pendingExpired.mockReturnValue(false);
    expect(str(await run('/painel'))).toBe('/primeiro-acesso/senha');
  });

  it('depois de recarregar (sem etapa em memória e /me 401 da sessão pendente) vai ao login', async () => {
    fake.authenticated.mockReturnValue(false);
    fake.restore.mockResolvedValue(false);
    expect(str(await run('/painel'))).toBe('/login');
  });

  const perm = (ability?: string) =>
    TestBed.runInInjectionContext(() =>
      permissionGuard(
        { data: ability ? { ability } : {} } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

  it('rota com permissão exigida: nega sem ela e libera com ela', () => {
    fake.can.mockReturnValue(false);
    expect(str(perm('users.manage'))).toBe('/acesso-negado');
    fake.can.mockReturnValue(true);
    expect(perm('users.manage')).toBe(true);
  });

  it('rota sem permissão declarada só exige sessão', () => {
    expect(perm()).toBe(true);
    expect(fake.can).not.toHaveBeenCalled();
  });
});
