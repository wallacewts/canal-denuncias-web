/**
 * PROVISÓRIO (research.md R2, Complexity Tracking do plano): tipos escritos à mão porque PUB-01, PUB-03, MSG-01 e
 * MSG-02 ainda não existem no contrato da API. A T037 troca tudo pelo cliente gerado de `openapi/public.json` e apaga
 * este arquivo. Enquanto isso, toda resposta é validada em tempo de execução, com as chaves exatas do contrato: uma
 * resposta inesperada (inclusive com um campo a mais, como um nome) vira erro, nunca dado na tela.
 */

export type PublicStatus = 'RECEIVED' | 'IN_REVIEW' | 'AWAITING_REPORTER' | 'CLOSED' | 'CONCLUDED';
export type Outcome = 'SUBSTANTIATED' | 'PARTIALLY_SUBSTANTIATED' | 'UNSUBSTANTIATED';
export type MessageAuthor = 'REPORTER' | 'TEAM';

const PUBLIC_STATUSES: readonly PublicStatus[] = [
  'RECEIVED',
  'IN_REVIEW',
  'AWAITING_REPORTER',
  'CLOSED',
  'CONCLUDED',
];
const OUTCOMES: readonly Outcome[] = [
  'SUBSTANTIATED',
  'PARTIALLY_SUBSTANTIATED',
  'UNSUBSTANTIATED',
];
const AUTHORS: readonly MessageAuthor[] = ['REPORTER', 'TEAM'];

/** Corpo de `POST /api/public/v1/tracking/sessions` (PUB-01). Só no corpo, nunca na URL. */
export interface ProvisionalAccessRequest {
  readonly protocol: string;
  readonly accessKey: string;
}

/** Resposta da abertura de acesso: credencial de 15 minutos e o instante em que expira (premissa I2). */
export interface ProvisionalAccessGrant {
  readonly token: string;
  readonly expiresAt: Date;
}

export interface ProvisionalTimelineEntry {
  readonly on: string;
  readonly status: PublicStatus;
}

/** Resposta de `GET /api/public/v1/me/report` (PUB-03): status e desfecho em código, só datas. */
export interface ProvisionalTrackingReport {
  readonly status: PublicStatus;
  readonly outcome: Outcome | null;
  readonly replyDeadline: string | null;
  readonly category: { readonly code: string; readonly name: string };
  readonly receivedOn: string;
  readonly timeline: readonly ProvisionalTimelineEntry[];
  readonly canReply: boolean;
}

/** Mensagem de `GET`/`POST /api/public/v1/me/messages` (MSG-01, MSG-02): autor em código e só a data. */
export interface ProvisionalTrackingMessage {
  readonly id: string;
  readonly author: MessageAuthor;
  readonly body: string;
  readonly sentOn: string;
}

/** Resposta da API fora do formato esperado. A mensagem nunca repete o conteúdo recebido. */
export class InvalidTrackingResponseError extends Error {
  constructor(what: string) {
    super(`Resposta da API fora do formato esperado: ${what}`);
    this.name = 'InvalidTrackingResponseError';
  }
}

type Rec = Record<string, unknown>;
const isRecord = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const hasExactKeys = (v: Rec, keys: readonly string[]) =>
  Object.keys(v).length === keys.length && keys.every((k) => k in v);
const isFilledText = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isOneOf = <T extends string>(v: unknown, list: readonly T[]): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v);

export function toAccessGrant(body: unknown): ProvisionalAccessGrant {
  if (
    !isRecord(body) ||
    !hasExactKeys(body, ['token', 'expiresAt']) ||
    !isFilledText(body['token'])
  ) {
    throw new InvalidTrackingResponseError('acesso');
  }
  const expiresAt = new Date(String(body['expiresAt']));
  if (typeof body['expiresAt'] !== 'string' || Number.isNaN(expiresAt.getTime())) {
    throw new InvalidTrackingResponseError('acesso');
  }
  return { token: body['token'], expiresAt };
}

const REPORT_KEYS = [
  'status',
  'outcome',
  'replyDeadline',
  'category',
  'receivedOn',
  'timeline',
  'canReply',
] as const;

export function toTrackingReport(body: unknown): ProvisionalTrackingReport {
  const fail = () => new InvalidTrackingResponseError('andamento');
  if (!isRecord(body) || !hasExactKeys(body, REPORT_KEYS)) throw fail();
  const { status, outcome, replyDeadline, category, receivedOn, timeline, canReply } = body;
  if (!isOneOf(status, PUBLIC_STATUSES)) throw fail();
  if (!(outcome === null || isOneOf(outcome, OUTCOMES))) throw fail();
  if (!(replyDeadline === null || isDate(replyDeadline))) throw fail();
  if (
    !isRecord(category) ||
    !hasExactKeys(category, ['code', 'name']) ||
    !isFilledText(category['code']) ||
    !isFilledText(category['name'])
  )
    throw fail();
  if (!isDate(receivedOn) || typeof canReply !== 'boolean' || !Array.isArray(timeline))
    throw fail();
  const entries = timeline.map((entry: unknown) => {
    if (
      !isRecord(entry) ||
      !hasExactKeys(entry, ['on', 'status']) ||
      !isDate(entry['on']) ||
      !isOneOf(entry['status'], PUBLIC_STATUSES)
    )
      throw fail();
    return { on: entry['on'], status: entry['status'] };
  });
  return {
    status,
    outcome,
    replyDeadline,
    category: { code: category['code'], name: category['name'] },
    receivedOn,
    timeline: entries,
    canReply,
  };
}

export function toTrackingMessage(body: unknown): ProvisionalTrackingMessage {
  if (
    !isRecord(body) ||
    !hasExactKeys(body, ['id', 'author', 'body', 'sentOn']) ||
    !isFilledText(body['id']) ||
    !isOneOf(body['author'], AUTHORS) ||
    typeof body['body'] !== 'string' ||
    !isDate(body['sentOn'])
  ) {
    throw new InvalidTrackingResponseError('mensagem');
  }
  return { id: body['id'], author: body['author'], body: body['body'], sentOn: body['sentOn'] };
}

export function toTrackingMessages(body: unknown): ProvisionalTrackingMessage[] {
  if (!isRecord(body) || !hasExactKeys(body, ['items']) || !Array.isArray(body['items'])) {
    throw new InvalidTrackingResponseError('mensagens');
  }
  return body['items'].map(toTrackingMessage);
}
