import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  provideRouter,
  type RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { ReporterSession } from '@canal/shared';
import { reporterAccessGuard } from './reporter-access.guard';

describe('reporterAccessGuard (/acompanhamento)', () => {
  const run = () =>
    TestBed.runInInjectionContext(() =>
      reporterAccessGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/acompanhamento' } as RouterStateSnapshot,
      ),
    );

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('sem credencial manda para /consultar', () => {
    const result = run();
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result)).toBe('/consultar');
  });

  it('com credencial permite', () => {
    TestBed.inject(ReporterSession).start('t', new Date(Date.now() + 60_000));
    expect(run()).toBe(true);
  });
});
