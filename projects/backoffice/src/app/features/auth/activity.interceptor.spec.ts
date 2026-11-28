import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { activityInterceptor } from './activity.interceptor';
import { StaffSession } from './staff-session';

describe('activityInterceptor (R3)', () => {
  const markActivity = vi.fn();

  beforeEach(() => {
    markActivity.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([activityInterceptor])),
        provideHttpClientTesting(),
        { provide: StaffSession, useValue: { markActivity } },
      ],
    });
  });

  it('resposta 2xx de chamada administrativa marca atividade', () => {
    TestBed.inject(HttpClient).get('api:/admin/v1/me').subscribe();
    TestBed.inject(HttpTestingController).expectOne('api:/admin/v1/me').flush({});
    expect(markActivity).toHaveBeenCalledTimes(1);
  });

  it('erro, chamada pública e saída não marcam atividade', () => {
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);
    http.get('api:/admin/v1/me').subscribe({ error: () => undefined });
    ctrl.expectOne('api:/admin/v1/me').flush(null, { status: 401, statusText: 'x' });
    http.get('api:/public/v1/categories').subscribe();
    ctrl.expectOne('api:/public/v1/categories').flush([]);
    http.post('api:/admin/v1/auth/sign-out', null).subscribe();
    ctrl.expectOne('api:/admin/v1/auth/sign-out').flush(null, { status: 204, statusText: 'x' });
    expect(markActivity).not.toHaveBeenCalled();
  });
});
