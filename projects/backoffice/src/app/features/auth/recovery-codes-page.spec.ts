import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterOutlet, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EnrollmentState } from './enrollment-state';
import { RecoveryCodesPage } from './recovery-codes-page';
import { SignInFlow } from './sign-in-flow';

const CODES = Array.from({ length: 10 }, (_, i) => `SIM-${i}`);

describe('RecoveryCodesPage (BAUTH-03)', () => {
  const finish = vi.fn().mockResolvedValue(undefined);
  let seed: string[] | null = CODES;

  @Component({
    imports: [RouterOutlet],
    providers: [EnrollmentState],
    template: '<router-outlet />',
  })
  class Parent {
    constructor() {
      if (seed) inject(EnrollmentState).set({ recoveryCodes: seed });
    }
  }

  async function render(codes: string[] | null = CODES) {
    seed = codes;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'primeiro-acesso',
            component: Parent,
            children: [{ path: 'codigos', component: RecoveryCodesPage }],
          },
          { path: 'painel', children: [] },
        ]),
        { provide: SignInFlow, useValue: { finish } },
      ],
    });
    const harness = await RouterTestingHarness.create('/primeiro-acesso/codigos');
    const el = harness.routeNativeElement as HTMLElement;
    const button = (name: string) =>
      [...el.querySelectorAll('button')].find(
        (b) => b.textContent?.trim() === name,
      ) as HTMLButtonElement;
    return { harness, el, button };
  }

  beforeEach(() => finish.mockClear());
  afterEach(() => vi.unstubAllGlobals());

  it('mostra os 10 códigos e só libera Continuar depois de "Guardei os códigos"', async () => {
    const { el, harness, button } = await render();
    expect(el.querySelectorAll('[data-testid="code"]').length).toBe(10);
    expect(button('Continuar').disabled).toBe(true);
    (el.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    harness.detectChanges();
    expect(button('Continuar').disabled).toBe(false);
    button('Continuar').click();
    expect(finish).toHaveBeenCalled();
  });

  it('copiar negado orienta a copiar manualmente ou baixar', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('x')) },
    });
    const { el, harness, button } = await render();
    button('Copiar').click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(el.querySelector('[data-testid="copy-status"]')?.textContent).toContain(
      'baixe o arquivo',
    );
  });

  it('sem área de transferência (navigator.clipboard ausente) orienta a copiar manualmente ou baixar', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    const { el, harness, button } = await render();
    button('Copiar').click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(el.querySelector('[data-testid="copy-status"]')?.textContent).toContain(
      'baixe o arquivo',
    );
  });

  it('recarregar (sem códigos em memória) informa que já foram exibidos', async () => {
    const { el } = await render(null);
    expect(el.querySelectorAll('[data-testid="code"]').length).toBe(0);
    expect(el.textContent).toContain('já foram exibidos');
  });
});
