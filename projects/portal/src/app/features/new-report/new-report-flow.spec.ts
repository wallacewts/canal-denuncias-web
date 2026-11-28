import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ConfirmDialog } from '@canal/shared';
import { of } from 'rxjs';
import { NewReportFlow } from './new-report-flow';
import { ReceiptState } from './receipt.state';
import { ReportDraftState } from './report-draft.state';
import { firstPendingStep } from './wizard-steps';

@Component({ template: '<h1 tabindex="-1">Etapa</h1>' })
class StubStep {}

const ROUTES = [
  {
    path: 'nova-denuncia',
    component: NewReportFlow,
    children: ['tipo', 'categoria', 'relato', 'envolvidos', 'revisao', 'protocolo'].map((path) => ({
      path,
      component: StubStep,
    })),
  },
];

describe('firstPendingStep', () => {
  const complete = (done: string[]) => (key: string) => done.includes(key);

  it('não redireciona quando as etapas obrigatórias anteriores estão completas', () => {
    expect(firstPendingStep(complete(['reporterType', 'category']), 'relato')).toBeNull();
  });

  it('aponta a primeira obrigatória incompleta antes da pedida', () => {
    expect(firstPendingStep(complete([]), 'revisao')).toBe('tipo');
    expect(firstPendingStep(complete(['reporterType']), 'envolvidos')).toBe('categoria');
    expect(firstPendingStep(complete(['reporterType', 'category']), 'revisao')).toBe('relato');
  });

  it('nunca redireciona a primeira etapa nem a tela do protocolo', () => {
    expect(firstPendingStep(complete([]), 'tipo')).toBeNull();
    expect(firstPendingStep(complete([]), 'protocolo')).toBeNull();
  });
});

describe('NewReportFlow', () => {
  async function setup(url: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(ROUTES),
        { provide: ConfirmDialog, useValue: { open: vi.fn(() => of(true)) } },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
    const flowDebug = harness.fixture.debugElement.query(By.directive(NewReportFlow));
    return {
      flow: flowDebug.componentInstance as NewReportFlow,
      draft: flowDebug.injector.get(ReportDraftState),
      receipt: flowDebug.injector.get(ReceiptState),
      router: TestBed.inject(Router),
    };
  }

  it('endereço de etapa posterior vai para a primeira pendente, sem dados na URL', async () => {
    const { router } = await setup('/nova-denuncia/revisao');
    expect(router.url).toBe('/nova-denuncia/tipo');
  });

  it('beforeunload só com rascunho preenchido ou comprovante', async () => {
    const { flow, draft, receipt } = await setup('/nova-denuncia/tipo');
    const event = () => new Event('beforeunload', { cancelable: true });

    const empty = event();
    flow.onBeforeUnload(empty);
    expect(empty.defaultPrevented).toBe(false);

    draft.form.controls.content.controls.location.setValue('a');
    const withDraft = event();
    flow.onBeforeUnload(withDraft);
    expect(withDraft.defaultPrevented).toBe(true);

    draft.clear();
    receipt.set({ protocol: 'P', accessKey: 'K', receivedOn: '2026-11-28' });
    const withReceipt = event();
    flow.onBeforeUnload(withReceipt);
    expect(withReceipt.defaultPrevented).toBe(true);
  });
});
