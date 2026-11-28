import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExpiryBanner } from './expiry-banner';
import { ReporterAccess } from './reporter-access';

describe('ExpiryBanner (aviso de expiração)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  afterEach(() => vi.useRealTimers());

  it('só aparece quando o acesso está perto de expirar, como alerta não modal', () => {
    const access = TestBed.inject(ReporterAccess);
    access.open('t', new Date(Date.now() + 15 * 60_000));
    const fixture = TestBed.createComponent(ExpiryBanner);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).toBeNull();
    vi.advanceTimersByTime(14 * 60_000);
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Seu acesso termina em 1 minuto. O texto que você ainda não enviou será perdido.',
    );
    access.ngOnDestroy();
  });
});
