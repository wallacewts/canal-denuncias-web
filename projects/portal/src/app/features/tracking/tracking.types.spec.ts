import {
  InvalidTrackingResponseError,
  toAccessGrant,
  toTrackingMessage,
  toTrackingMessages,
  toTrackingReport,
} from './tracking.types';

const REPORT = {
  status: 'AWAITING_REPORTER',
  outcome: null,
  replyDeadline: '2026-12-03',
  category: { code: 'VAZAMENTO', name: 'Vazamento de dados' },
  receivedOn: '2026-11-18',
  timeline: [{ on: '2026-11-18', status: 'RECEIVED' }],
  canReply: true,
};
const MESSAGE = { id: 'm1', author: 'TEAM', body: 'Olá', sentOn: '2026-11-20' };

describe('tracking.types (provisório até PUB-01, PUB-03, MSG-01 e MSG-02)', () => {
  it('aceita as quatro respostas no formato do contrato', () => {
    expect(toAccessGrant({ token: 't', expiresAt: '2026-11-28T12:15:00.000Z' })).toEqual({
      token: 't',
      expiresAt: new Date('2026-11-28T12:15:00.000Z'),
    });
    expect(toTrackingReport(REPORT)).toEqual(REPORT);
    expect(toTrackingMessages({ items: [MESSAGE] })).toEqual([MESSAGE]);
    expect(toTrackingMessage(MESSAGE)).toEqual(MESSAGE);
    expect(
      toTrackingReport({
        ...REPORT,
        status: 'CONCLUDED',
        outcome: 'SUBSTANTIATED',
        replyDeadline: null,
        canReply: false,
      }),
    ).toMatchObject({ outcome: 'SUBSTANTIATED' });
  });

  it.each([
    ['token ausente', () => toAccessGrant({ expiresAt: '2026-11-28T12:15:00.000Z' })],
    ['expiração inválida', () => toAccessGrant({ token: 't', expiresAt: 'XQZ' })],
    ['status desconhecido', () => toTrackingReport({ ...REPORT, status: 'XQZ' })],
    ['desfecho desconhecido', () => toTrackingReport({ ...REPORT, outcome: 'XQZ' })],
    ['data com hora', () => toTrackingReport({ ...REPORT, receivedOn: '2026-11-18T10:00:00Z' })],
    ['canReply ausente', () => toTrackingReport({ ...REPORT, canReply: undefined })],
    ['campo extra com nome', () => toTrackingReport({ ...REPORT, analystName: 'XQZ' })],
    ['autor desconhecido', () => toTrackingMessage({ ...MESSAGE, author: 'XQZ' })],
    ['mensagem com nome', () => toTrackingMessage({ ...MESSAGE, authorName: 'XQZ' })],
    [
      'data da mensagem com hora',
      () => toTrackingMessage({ ...MESSAGE, sentOn: '2026-11-20T09:15' }),
    ],
    ['lista sem items', () => toTrackingMessages([MESSAGE])],
  ])('recusa %s sem repetir o valor recebido', (_name, parse) => {
    let error: unknown;
    try {
      parse();
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(InvalidTrackingResponseError);
    expect(String((error as Error).message)).not.toContain('XQZ');
  });
});
