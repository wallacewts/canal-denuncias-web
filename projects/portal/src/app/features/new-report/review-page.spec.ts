import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { ReceiptState } from './receipt.state';
import { ReportDraftState } from './report-draft.state';
import { ReportSubmissionApi } from './report-submission.api';
import type { ProvisionalReportReceipt } from './report-submission.types';
import { ReviewPage } from './review-page';

const RECEIPT: ProvisionalReportReceipt = {
  protocol: 'DV-AB12C-3DE45',
  accessKey: 'K',
  receivedOn: '2026-11-28',
};

function setup() {
  const response = new Subject<ProvisionalReportReceipt>();
  const api = { submit: vi.fn(() => response) };
  TestBed.configureTestingModule({
    imports: [ReviewPage],
    providers: [
      ReportDraftState,
      ReceiptState,
      provideRouter([]),
      { provide: ReportSubmissionApi, useValue: api },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const draft = TestBed.inject(ReportDraftState);
  draft.form.patchValue({
    reporterType: { type: 'EMPLOYEE' },
    category: { code: 'A' },
    content: { description: 'Relato <b>curto</b> '.padEnd(100, 'x'), location: 'Sala 3' },
  });
  draft.categoryName.set('Vazamento de dados');
  const fixture = TestBed.createComponent(ReviewPage);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const send = () =>
    [...el.querySelectorAll('button')].find((b) =>
      /Enviar denúncia|Tentar de novo/.test(b.textContent ?? ''),
    )!;
  return {
    fixture,
    el,
    api,
    response,
    navigate,
    draft,
    send,
    receipt: TestBed.inject(ReceiptState),
  };
}

describe('ReviewPage', () => {
  it('mostra tudo o que será enviado, como texto (sem interpretar HTML)', () => {
    const { el } = setup();
    expect(el.textContent).toContain('Colaborador');
    expect(el.textContent).toContain('Vazamento de dados');
    expect(el.textContent).toContain('Relato <b>curto</b>');
    expect(el.querySelector('b')).toBeNull();
    expect(el.textContent).toContain('Sala 3');
  });

  it('tem um link de edição para cada etapa', () => {
    const { el } = setup();
    const links = [...el.querySelectorAll('a')].map((a) => a.textContent?.trim());
    for (const label of [
      'Editar tipo de denunciante',
      'Editar categoria',
      'Editar relato',
      'Editar envolvidos',
    ]) {
      expect(links).toContain(label);
    }
  });

  it('o aviso de privacidade vem antes do botão de enviar', () => {
    const { el, send } = setup();
    const privacy = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('aviso de privacidade'),
    )!;
    expect(privacy.compareDocumentPosition(send()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('envia uma vez só e desabilita o botão durante o envio', () => {
    const { fixture, api, send } = setup();
    send().click();
    send().click();
    fixture.detectChanges();
    expect(api.submit).toHaveBeenCalledTimes(1);
    expect(send().disabled).toBe(true);
  });

  it('com sucesso, guarda o comprovante, apaga o rascunho e vai para o protocolo', () => {
    const { fixture, response, navigate, draft, send, receipt } = setup();
    send().click();
    response.next(RECEIPT);
    response.complete();
    fixture.detectChanges();
    expect(receipt.receipt()).toEqual(RECEIPT);
    expect(draft.hasData()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['../protocolo'], expect.anything());
  });
});
