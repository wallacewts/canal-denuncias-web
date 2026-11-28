import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from './provide-api';

describe('apiInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideApi(
          { apiBaseUrl: '/api' },
          { withCredentials: true, bearerFor: null, onUnauthenticated: () => undefined },
        ),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('troca o prefixo api: pela URL base e envia cookies', () => {
    http.get('api:/public/v1/categories').subscribe();
    const req = httpTesting.expectOne('/api/public/v1/categories');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('não altera chamadas sem o prefixo', () => {
    http.get('/config.json').subscribe();
    const req = httpTesting.expectOne('/config.json');
    expect(req.request.withCredentials).toBe(false);
    req.flush({});
  });
});
