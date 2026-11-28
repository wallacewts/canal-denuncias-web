import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ReporterAccess } from './reporter-access';
import { TrackingAccessPage } from './tracking-access-page';
import { TrackingApi } from './tracking.api';

describe('TrackingAccessPage (PACC-02)', () => {
  const openAccess = vi.fn();

  async function render(before: () => void = () => undefined) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'consultar', component: TrackingAccessPage },
          { path: 'acompanhamento', children: [] },
        ]),
        { provide: TrackingApi, useValue: { openAccess } },
      ],
    });
    before();
    const harness = await RouterTestingHarness.create('/consultar');
    const el = harness.routeNativeElement as HTMLElement;
    const names: Record<string, string> = { Protocolo: 'protocol', 'Chave de acesso': 'accessKey' };
    const input = (label: string) =>
      el.querySelector(`input[formcontrolname="${names[label]}"]`) as HTMLInputElement;
    const type = (label: string, value: string) => {
      const i = input(label);
      i.value = value;
      i.dispatchEvent(new Event('input'));
    };
    const submit = async () => {
      el.querySelector('form')?.dispatchEvent(new Event('submit'));
      harness.detectChanges();
      await harness.fixture.whenStable();
    };
    return { harness, el, input, type, submit };
  }

  beforeEach(() => openAccess.mockReset());

  it('normaliza o protocolo, abre o acesso e limpa os campos antes de navegar', async () => {
    openAccess.mockReturnValue(of({ token: 't', expiresAt: new Date(Date.now() + 900_000) }));
    const { type, submit, input } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    type('Protocolo', 'dv simul ado00');
    type('Chave de acesso', 'K');
    await submit();
    expect(openAccess).toHaveBeenCalledWith({ protocol: 'DV-SIMUL-ADO00', accessKey: 'K' });
    expect(TestBed.inject(ReporterAccess).active()).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/acompanhamento');
    expect(input('Protocolo').value).toBe('');
    expect(input('Chave de acesso').value).toBe('');
  });

  it('falha mostra a mensagem genérica e mantém os campos', async () => {
    openAccess.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const { type, submit, el, input, harness } = await render();
    type('Protocolo', 'DV-SIMUL-ADO00');
    type('Chave de acesso', 'XQZ');
    await submit();
    harness.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Protocolo ou chave inválidos.',
    );
    expect(input('Chave de acesso').value).toBe('XQZ');
  });

  it('mostra uma única vez o motivo do encerramento anterior, numa região de status', async () => {
    const { el } = await render(() => {
      const access = TestBed.inject(ReporterAccess);
      access.open('t', new Date(Date.now() + 900_000));
      access.end('logout');
    });
    expect(el.querySelector('[data-testid="end-reason"]')?.getAttribute('role')).toBe('status');
    expect(el.querySelector('[data-testid="end-reason"]')?.textContent?.trim()).toBe(
      'Você saiu do acompanhamento.',
    );
    expect(TestBed.inject(ReporterAccess).consumeEndReason()).toBeNull();
  });
});
