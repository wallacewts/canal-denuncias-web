import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@canal/shared';
import { firstValueFrom } from 'rxjs';
import { PORTAL_API_POLICY } from '../../api-policy';
import { ReportSubmissionApi } from './report-submission.api';
import { InvalidApiResponseError } from './report-submission.types';

describe('ReportSubmissionApi (provisório até CAT-01 e REP-02)', () => {
  let api: ReportSubmissionApi;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideApi({ apiBaseUrl: '/api' }, PORTAL_API_POLICY),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(ReportSubmissionApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('busca as categorias sem credenciais e valida a resposta', async () => {
    const result = firstValueFrom(api.categories());
    const req = httpTesting.expectOne('/api/public/v1/categories');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(false);
    expect(req.request.credentials).toBe('omit');
    req.flush([{ code: 'A', name: 'N', description: null }]);
    expect(await result).toEqual([{ code: 'A', name: 'N', description: null }]);
  });

  it('envia a denúncia sem credenciais nem Bearer e devolve o comprovante', async () => {
    const body = {
      reporterType: 'EMPLOYEE' as const,
      categoryCode: 'A',
      description: 'x'.repeat(100),
    };
    const result = firstValueFrom(api.submit(body));
    const req = httpTesting.expectOne('/api/public/v1/reports');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.withCredentials).toBe(false);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(
      { protocol: 'DV-AB12C-3DE45', accessKey: 'K', receivedOn: '2026-11-28' },
      { status: 201, statusText: 'Created' },
    );
    expect(await result).toEqual({
      protocol: 'DV-AB12C-3DE45',
      accessKey: 'K',
      receivedOn: '2026-11-28',
    });
  });

  it('resposta fora do formato vira erro, sem virar dado na tela', async () => {
    const result = firstValueFrom(api.categories());
    httpTesting.expectOne('/api/public/v1/categories').flush({ itens: [] });
    await expect(result).rejects.toBeInstanceOf(InvalidApiResponseError);
  });
});
