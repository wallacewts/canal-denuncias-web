import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App (portal)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('mostra a navegação principal e o aviso de privacidade', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nova denúncia');
    expect(text).toContain('Consultar');
    expect(text).toContain('Aviso de privacidade');
  });

  it('define as 8 telas do portal', () => {
    const screens = routes.filter((r) => r.loadComponent).length;
    expect(screens).toBe(8);
  });
});
