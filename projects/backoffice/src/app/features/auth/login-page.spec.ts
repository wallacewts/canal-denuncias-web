import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER, of, throwError } from 'rxjs';
import { AuthApi } from './auth.api';
import { LoginPage } from './login-page';
import { SignInFlow } from './sign-in-flow';
import { StaffSession } from './staff-session';

describe('LoginPage (BAUTH-01)', () => {
  const signIn = vi.fn();
  const advance = vi.fn().mockResolvedValue(undefined);

  async function render(before: () => void = () => undefined) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', component: LoginPage }]),
        { provide: AuthApi, useValue: { signIn, signOut: () => of(null) } },
        { provide: SignInFlow, useValue: { advance } },
      ],
    });
    before();
    const harness = await RouterTestingHarness.create('/login');
    const el = harness.routeNativeElement as HTMLElement;
    const input = (name: string) =>
      el.querySelector(`input[formcontrolname="${name}"]`) as HTMLInputElement;
    const type = (name: string, value: string) => {
      input(name).value = value;
      input(name).dispatchEvent(new Event('input'));
    };
    const submit = async () => {
      el.querySelector('form')?.dispatchEvent(new Event('submit'));
      harness.detectChanges();
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    return { el, input, type, submit };
  }

  beforeEach(() => {
    signIn.mockReset();
    advance.mockClear();
  });

  it('envia e-mail e senha, limpa a senha e segue a etapa indicada pela API', async () => {
    const step = { value: { nextStep: 'MFA_REQUIRED' }, serverNow: null };
    signIn.mockReturnValue(of(step));
    const { type, submit, input } = await render();
    type('email', 'a@b');
    type('password', 'XQZ');
    await submit();
    expect(signIn).toHaveBeenCalledWith('a@b', 'XQZ');
    expect(advance).toHaveBeenCalledWith(step);
    expect(input('password').value).toBe('');
  });

  it('401 e 429 mostram exatamente a mesma mensagem e o mesmo estado (sem mensagem própria de bloqueio)', async () => {
    const snapshots: string[] = [];
    for (const status of [401, 429]) {
      TestBed.resetTestingModule();
      signIn.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
      const { type, submit, el, input } = await render();
      type('email', 'a@b');
      type('password', 'X');
      await submit();
      snapshots.push(
        JSON.stringify({
          alert: el.querySelector('[role="alert"]')?.textContent?.trim(),
          email: input('email').value,
          password: input('password').value,
        }),
      );
    }
    expect(snapshots[0]).toBe(snapshots[1]);
    expect(snapshots[0]).toContain('E-mail ou senha inválidos.');
    expect(snapshots[0]).toContain('"password":""');
  });

  it('clique duplo faz uma única chamada', async () => {
    signIn.mockReturnValue(NEVER);
    const { type, submit } = await render();
    type('email', 'a@b');
    type('password', 'X');
    await submit();
    type('password', 'X');
    await submit();
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('mostra uma vez, numa região de status, o motivo do encerramento anterior', async () => {
    const { el } = await render(() => {
      const session = TestBed.inject(StaffSession);
      session.startPending(
        'MFA_REQUIRED',
        {
          idleExpiresAt: new Date(Date.now() + 60_000),
          absoluteExpiresAt: new Date(Date.now() + 60_000),
        },
        null,
      );
      session.end('idle');
    });
    const status = el.querySelector('[data-testid="end-reason"]');
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.textContent?.trim()).toBe(
      'Sua sessão terminou por falta de uso. Entre de novo para continuar.',
    );
    expect(TestBed.inject(StaffSession).consumeEndReason()).toBeNull();
  });
});
