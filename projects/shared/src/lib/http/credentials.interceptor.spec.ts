import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReporterSession } from '../session/reporter-session';
import type { ApiPolicy } from './api-policy';
import { provideApi } from './provide-api';

const PORTAL: ApiPolicy = {
  audience: 'portal',
  withCredentials: false,
  bearerFor: '/public/v1/me/',
  onUnauthenticated: () => undefined,
};
const BACKOFFICE: ApiPolicy = {
  audience: 'backoffice',
  withCredentials: true,
  bearerFor: null,
  onUnauthenticated: () => undefined,
};

function setup(policy: ApiPolicy) {
  TestBed.configureTestingModule({
    providers: [provideApi({ apiBaseUrl: '/api' }, policy), provideHttpClientTesting()],
  });
  return {
    http: TestBed.inject(HttpClient),
    httpTesting: TestBed.inject(HttpTestingController),
    session: TestBed.inject(ReporterSession),
  };
}

describe('credentialsInterceptor', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  describe('portal (sem cookies, Bearer só no acompanhamento)', () => {
    it('nunca envia cookies, nem para a API no mesmo domínio', () => {
      const { http, httpTesting } = setup(PORTAL);
      http.get('api:/public/v1/categories').subscribe();
      const req = httpTesting.expectOne('/api/public/v1/categories');
      expect(req.request.withCredentials).toBe(false);
      expect(req.request.credentials).toBe('omit');
      req.flush([]);
    });

    it('envia o token do denunciante só em /public/v1/me/*', () => {
      const { http, httpTesting, session } = setup(PORTAL);
      session.start('token-do-denunciante', new Date(Date.now() + 60_000));

      http.get('api:/public/v1/me/report').subscribe();
      const me = httpTesting.expectOne('/api/public/v1/me/report');
      expect(me.request.headers.get('Authorization')).toBe('Bearer token-do-denunciante');
      me.flush({});

      http.post('api:/public/v1/reports', {}).subscribe();
      const other = httpTesting.expectOne('/api/public/v1/reports');
      expect(other.request.headers.has('Authorization')).toBe(false);
      other.flush({});
    });

    it('não anexa Authorization quando não há sessão', () => {
      const { http, httpTesting } = setup(PORTAL);
      http.get('api:/public/v1/me/report').subscribe();
      const req = httpTesting.expectOne('/api/public/v1/me/report');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });
  });

  describe('backoffice (cookie de sessão da equipe)', () => {
    it('envia o cookie em toda chamada à API e nunca Authorization', () => {
      const { http, httpTesting, session } = setup(BACKOFFICE);
      session.start('nao-deveria-ser-usado', new Date(Date.now() + 60_000));
      http.get('api:/admin/v1/reports').subscribe();
      const req = httpTesting.expectOne('/api/admin/v1/reports');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush([]);
    });
  });

  it('não altera chamadas sem o prefixo api:', () => {
    const { http, httpTesting } = setup(PORTAL);
    http.get('/config.json').subscribe();
    const req = httpTesting.expectOne('/config.json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.credentials).toBeUndefined();
    req.flush({});
  });
});
