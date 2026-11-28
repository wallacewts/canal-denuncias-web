import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAdminApiConfiguration } from '@canal/shared/api/admin';
import { API_CALLER_HANDLES } from '@canal/shared/http';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from './auth.api';

/** T046: as chamadas usam o cliente gerado de `openapi/admin.json` (caminhos com `/api`, tratados pelo `api:`). */
describe('AuthApi (cliente gerado)', () => {
  const EXPIRY = {
    idleExpiresAt: '2026-11-28T12:15:00.000Z',
    absoluteExpiresAt: '2026-11-28T20:00:00.000Z',
  };
  let http: HttpTestingController;
  let api: AuthApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAdminApiConfiguration('api:'),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(AuthApi);
  });
  afterEach(() => http.verify());

  it('login: POST no caminho do contrato, 401 e 429 tratados pela tela, horário do servidor pelo Date', async () => {
    const result = firstValueFrom(api.signIn('a@x.test', 'senha-bem-longa'));
    const req = http.expectOne('api:/api/admin/v1/auth/sign-in');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@x.test', password: 'senha-bem-longa' });
    expect(req.request.context.get(API_CALLER_HANDLES)).toEqual([401, 429]);
    req.flush(
      { nextStep: 'MFA_REQUIRED', ...EXPIRY },
      { headers: { Date: 'Sat, 28 Nov 2026 12:00:00 GMT' } },
    );
    const { value, serverNow } = await result;
    expect(value.nextStep).toBe('MFA_REQUIRED');
    expect(value.idleExpiresAt).toEqual(new Date(EXPIRY.idleExpiresAt));
    expect(serverNow).toBe(Date.parse('Sat, 28 Nov 2026 12:00:00 GMT'));
  });

  it('desafio e cadastro: 422 (e 423 no desafio) tratados pela tela; o 401 segue para a política', () => {
    api.challenge({ code: '123456' }).subscribe();
    const challenge = http.expectOne('api:/api/admin/v1/auth/mfa/challenge');
    expect(challenge.request.context.get(API_CALLER_HANDLES)).toEqual([422, 423]);
    challenge.flush({ nextStep: 'DONE', ...EXPIRY });
    api.startEnrollment().subscribe();
    http.expectOne('api:/api/admin/v1/auth/mfa/enrollment').flush({
      otpauthUri: 'otpauth://x',
      qrCodeDataUri: 'data:image/png;base64,AAAA',
      secret: 'S',
    });
    api.confirmEnrollment('123456').subscribe();
    const confirm = http.expectOne('api:/api/admin/v1/auth/mfa/enrollment/confirmation');
    expect(confirm.request.context.get(API_CALLER_HANDLES)).toEqual([422]);
    confirm.flush({
      recoveryCodes: Array.from({ length: 10 }, (_, i) => `C${i}`),
      nextStep: 'DONE',
      ...EXPIRY,
    });
  });

  it('troca de senha, /me e saída nos caminhos do contrato', () => {
    api.changePassword('atual', 'nova-senha-longa').subscribe();
    const pwd = http.expectOne('api:/api/admin/v1/me/password');
    expect(pwd.request.method).toBe('PUT');
    expect(pwd.request.context.get(API_CALLER_HANDLES)).toEqual([422, 429]);
    pwd.flush({ nextStep: 'DONE', ...EXPIRY });
    api.me(true).subscribe();
    const me = http.expectOne('api:/api/admin/v1/me');
    expect(me.request.context.get(API_CALLER_HANDLES)).toEqual([401]);
    me.flush({
      id: 'u',
      name: 'N',
      email: 'n@x.test',
      roles: ['ADMIN'],
      mfaEnabledAt: null,
      passwordChangeRequired: false,
      abilities: ['users.manage'],
      ...EXPIRY,
    });
    api.signOut().subscribe();
    const out = http.expectOne('api:/api/admin/v1/auth/sign-out');
    expect(out.request.method).toBe('POST');
    out.flush('', { status: 204, statusText: 'No Content' });
  });
});
