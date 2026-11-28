import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReporterSession } from '@canal/shared';
import { NEVER, of } from 'rxjs';
import { TrackingApi } from './tracking.api';
import type { ProvisionalTrackingReport } from './tracking.types';
import { TrackingMessages } from './tracking-messages';
import { TrackingViewState } from './tracking-view.state';

const REPORT: ProvisionalTrackingReport = {
  status: 'IN_REVIEW',
  outcome: null,
  replyDeadline: null,
  category: { code: 'C', name: 'N' },
  receivedOn: '2026-11-18',
  timeline: [],
  canReply: true,
};

describe('TrackingMessages (PTRK-02)', () => {
  const send = vi.fn();

  function render(
    messages = [{ id: '1', author: 'TEAM' as const, body: '<b>negrito</b>', sentOn: '2026-11-20' }],
  ) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        TrackingViewState,
        {
          provide: TrackingApi,
          useValue: { send, report: () => of(REPORT), messages: () => of(messages) },
        },
      ],
    });
    TestBed.inject(ReporterSession).start('t', new Date(Date.now() + 900_000));
    TestBed.inject(TrackingViewState).set({ report: REPORT, messages });
    const fixture = TestBed.createComponent(TrackingMessages);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => send.mockReset());

  it('mostra o texto da mensagem literal, sem interpretar HTML, e o autor sem nome', () => {
    const { el } = render();
    const item = el.querySelector('[data-testid="messages"] li') as HTMLElement;
    expect(item.textContent).toContain('<b>negrito</b>');
    expect(item.querySelector('b')).toBeNull();
    expect(item.textContent).toContain('Equipe de apuração');
  });

  it('contador mostra quantos caracteres restam', async () => {
    const { el, fixture } = render();
    const field = el.querySelector('textarea') as HTMLTextAreaElement;
    field.value = 'abc';
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el.textContent).toContain('Restam 4997 caracteres');
  });

  it('desabilita o envio durante a requisição', async () => {
    send.mockReturnValue(NEVER);
    const { el, fixture } = render();
    const field = el.querySelector('textarea') as HTMLTextAreaElement;
    field.value = 'oi';
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    const button = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Enviar'),
    );
    expect(button?.disabled).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('lista vazia mostra a orientação para a primeira mensagem', () => {
    const { el } = render([]);
    expect(el.textContent).toContain('Ainda não há mensagens.');
    expect(el.textContent).toContain('Use o campo abaixo para escrever à equipe de apuração.');
  });
});
