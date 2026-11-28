import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AuthApi } from './auth.api';
import { EnrollmentState } from './enrollment-state';
import { MfaEnrollmentPage } from './mfa-enrollment-page';
import { StaffSession } from './staff-session';

@Component({ imports: [RouterOutlet], providers: [EnrollmentState], template: '<router-outlet />' })
class Parent {}

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const CODES = Array.from({ length: 10 }, (_, i) => `C-${i}`);

describe('MfaEnrollmentPage (BAUTH-03)', () => {
  const startEnrollment = vi.fn();
  const confirmEnrollment = vi.fn();

  async function render(pendingMs = 5 * 60_000) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'primeiro-acesso',
            component: Parent,
            children: [
              { path: 'autenticador', component: MfaEnrollmentPage },
              { path: 'codigos', children: [] },
            ],
          },
          { path: 'login', children: [] },
        ]),
        {
          provide: AuthApi,
          useValue: { startEnrollment, confirmEnrollment, signOut: () => of(null) },
        },
      ],
    });
    TestBed.inject(StaffSession).startPending(
      'MFA_ENROLLMENT_REQUIRED',
      {
        idleExpiresAt: new Date(Date.now() + pendingMs),
        absoluteExpiresAt: new Date(Date.now() + 3_600_000),
      },
      null,
    );
    const harness = await RouterTestingHarness.create('/primeiro-acesso/autenticador');
    const el = harness.routeNativeElement as HTMLElement;
    const type = (v: string) => {
      const i = el.querySelector('input[formcontrolname="code"]') as HTMLInputElement;
      i.value = v;
      i.dispatchEvent(new Event('input'));
    };
    const submit = async () => {
      el.querySelector('form')?.dispatchEvent(new Event('submit'));
      harness.detectChanges();
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    return { harness, el, type, submit };
  }

  beforeEach(() => {
    startEnrollment
      .mockReset()
      .mockReturnValue(
        of({ otpauthUri: 'otpauth://x', qrCodeDataUri: PNG, secret: 'ABCDEFGHIJKL' }),
      );
    confirmEnrollment.mockReset();
  });

  it('mostra o QR code PNG embutido e o segredo em blocos de 4 para digitação manual', async () => {
    const { el } = await render();
    const img = el.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(PNG);
    expect(img.getAttribute('alt')).toContain('segredo');
    expect(el.querySelector('[data-testid="secret"]')?.textContent?.trim()).toBe('ABCD EFGH IJKL');
  });

  it('código inválido não ativa; código válido guarda os códigos e segue sem o segredo', async () => {
    const { el, type, submit } = await render();
    confirmEnrollment.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    type('000000');
    await submit();
    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Código inválido. Confira e tente de novo.',
    );
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    confirmEnrollment.mockReturnValue(
      of({ value: { recoveryCodes: CODES, nextStep: 'DONE' }, serverNow: null }),
    );
    type('123456');
    await submit();
    expect(navigate).toHaveBeenCalledWith('/primeiro-acesso/codigos', { replaceUrl: true });
    expect(TestBed.inject(StaffSession).pending()).toBeNull();
  });

  it('ao destruir a tela, segredo e QR code somem da memória', async () => {
    const { harness } = await render();
    const state =
      harness.fixture.debugElement.injector.get(EnrollmentState, null) ??
      harness.routeDebugElement?.injector.get(EnrollmentState);
    expect(state?.value()?.enrollment?.secret).toBe('ABCDEFGHIJKL');
    await harness.navigateByUrl('/login');
    expect(state?.value()).toBeNull();
  });

  it('401 com a sessão pendente expirada volta ao login', async () => {
    confirmEnrollment.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const { type, submit } = await render(1);
    await new Promise((r) => setTimeout(r, 5));
    type('123456');
    await submit();
    expect(TestBed.inject(StaffSession).consumeEndReason()).toBe('unauthenticated');
  });
});
