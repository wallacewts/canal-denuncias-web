import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationService, provideApi, ReporterSession } from '@canal/shared';
import { firstValueFrom } from 'rxjs';
import { PORTAL_API_POLICY } from '../../api-policy';
import { TrackingApi } from './tracking.api';

describe('TrackingApi (provisório até PUB-01, PUB-03, MSG-01 e MSG-02)', () => {
  let api: TrackingApi;
  let httpTesting: HttpTestingController;
  const notifications = { error: vi.fn(), success: vi.fn() };

  beforeEach(() => {
    notifications.error.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideApi({ apiBaseUrl: '/api' }, PORTAL_API_POLICY),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    api = TestBed.inject(TrackingApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('abre o acesso com protocolo e chave só no corpo, sem Bearer e sem credenciais', async () => {
    const result = firstValueFrom(api.openAccess({ protocol: 'DV-AB12C-3DE45', accessKey: 'XQZ' }));
    const req = httpTesting.expectOne('/api/public/v1/tracking/sessions');
    expect(req.request.method).toBe('POST');
    expect(req.request.urlWithParams).toBe('/api/public/v1/tracking/sessions');
    expect(req.request.urlWithParams).not.toContain('XQZ');
    expect(req.request.body).toEqual({ protocol: 'DV-AB12C-3DE45', accessKey: 'XQZ' });
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(false);
    req.flush({ token: 't', expiresAt: '2026-11-28T12:15:00.000Z' });
    expect((await result).token).toBe('t');
  });

  it.each([400, 401, 429])(
    'falha %i da consulta não mostra mensagem padrão (a tela mostra a genérica)',
    async (status) => {
      const result = firstValueFrom(api.openAccess({ protocol: 'P', accessKey: 'K' })).catch(
        (e: unknown) => e,
      );
      httpTesting
        .expectOne('/api/public/v1/tracking/sessions')
        .flush(null, { status, statusText: 'Erro' });
      await result;
      expect(notifications.error).not.toHaveBeenCalled();
    },
  );

  it('rotas /me/* levam o Bearer do denunciante, sem credenciais', async () => {
    TestBed.inject(ReporterSession).start('token-x', new Date(Date.now() + 60_000));
    void firstValueFrom(api.report()).catch(() => undefined);
    void firstValueFrom(api.messages()).catch(() => undefined);
    void firstValueFrom(api.send('oi')).catch(() => undefined);
    const reqs = httpTesting.match((r) => r.url.startsWith('/api/public/v1/me/'));
    expect(reqs.map((r) => `${r.request.method} ${r.request.url}`)).toEqual([
      'GET /api/public/v1/me/report',
      'GET /api/public/v1/me/messages',
      'POST /api/public/v1/me/messages',
    ]);
    for (const r of reqs) {
      expect(r.request.headers.get('Authorization')).toBe('Bearer token-x');
      expect(r.request.withCredentials).toBe(false);
      r.flush(null, { status: 500, statusText: 'Erro' });
    }
  });

  it('409 no envio fica com a tela (sem a mensagem padrão)', async () => {
    TestBed.inject(ReporterSession).start('token-x', new Date(Date.now() + 60_000));
    const result = firstValueFrom(api.send('oi')).catch((e: unknown) => e);
    httpTesting
      .expectOne('/api/public/v1/me/messages')
      .flush(null, { status: 409, statusText: 'Erro' });
    await result;
    expect(notifications.error).not.toHaveBeenCalled();
  });
});
