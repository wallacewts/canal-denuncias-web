import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ProvisionalTrackingReport } from './tracking.types';
import { TrackingStatus } from './tracking-status';

const BASE: ProvisionalTrackingReport = {
  status: 'IN_REVIEW',
  outcome: null,
  replyDeadline: null,
  category: { code: 'C', name: 'Vazamento de dados' },
  receivedOn: '2026-11-18',
  timeline: [],
  canReply: true,
};

describe('TrackingStatus (PTRK-01)', () => {
  let fixture: ComponentFixture<TrackingStatus>;
  const render = (report: ProvisionalTrackingReport) => {
    fixture = TestBed.createComponent(TrackingStatus);
    fixture.componentRef.setInput('report', report);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const text = (el: HTMLElement, id: string) =>
    el.querySelector(`[data-testid="${id}"]`)?.textContent?.trim();

  it('mostra o status em texto e não mostra desfecho quando não concluída', () => {
    const el = render(BASE);
    expect(text(el, 'status')).toBe('Em análise');
    expect(el.querySelector('[data-testid="outcome"]')).toBeNull();
    expect(el.querySelector('[data-testid="reply-deadline"]')).toBeNull();
  });

  it('concluída mostra o desfecho', () => {
    const el = render({
      ...BASE,
      status: 'CONCLUDED',
      outcome: 'PARTIALLY_SUBSTANTIATED',
      canReply: false,
    });
    expect(text(el, 'status')).toBe('Concluída');
    expect(text(el, 'outcome')).toBe('Parcialmente procedente');
  });

  it('aguardando mostra o prazo e emite "Responder agora"', () => {
    const el = render({ ...BASE, status: 'AWAITING_REPORTER', replyDeadline: '2999-01-31' });
    expect(text(el, 'reply-deadline')).toBe('Responda até 31/01/2999');
    let replied = false;
    fixture.componentInstance.replyNow.subscribe(() => (replied = true));
    (el.querySelector('button') as HTMLButtonElement).click();
    expect(replied).toBe(true);
  });

  it('prazo vencido aparece como vencido', () => {
    const el = render({ ...BASE, status: 'AWAITING_REPORTER', replyDeadline: '2000-01-31' });
    expect(text(el, 'reply-deadline')).toBe('Prazo vencido em 31/01/2000');
  });
});
