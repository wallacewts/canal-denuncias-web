/**
 * PROVISÓRIO (research.md R2, Complexity Tracking do plano): tipos escritos à mão porque CAT-01 e REP-02 ainda não
 * existem no contrato da API. A tarefa T048 troca tudo pelo cliente gerado de `openapi/public.json` e apaga este
 * arquivo. Enquanto isso, toda resposta é validada em tempo de execução: uma resposta inesperada vira erro, nunca dado
 * na tela.
 */

export type ReporterType = 'EMPLOYEE' | 'PARTNER' | 'THIRD_PARTY';

/** Provisório: lista levada ao REP-02 (decisão de 2026-11-28); conferida contra o contrato na T049. */
export type DataType = 'PERSONAL' | 'FINANCIAL' | 'CREDENTIALS' | 'OTHER';

export const REPORTER_TYPES: readonly ReporterType[] = ['EMPLOYEE', 'PARTNER', 'THIRD_PARTY'];
export const DATA_TYPES: readonly DataType[] = ['PERSONAL', 'FINANCIAL', 'CREDENTIALS', 'OTHER'];

export interface ProvisionalCategory {
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
}

export interface ProvisionalInvolved {
  readonly name?: string;
  readonly role?: string;
}

/** Corpo de `POST /api/public/v1/reports` (REP-02). Nunca leva identificação (PNEW-08 fora do escopo). */
export interface ProvisionalReportSubmission {
  readonly reporterType: ReporterType;
  readonly categoryCode: string;
  readonly description: string;
  readonly occurredOn?: string;
  readonly location?: string;
  readonly affectedSystems?: string;
  readonly dataTypes?: readonly DataType[];
  readonly involved?: readonly ProvisionalInvolved[];
  readonly howKnown?: string;
  readonly evidenceNotes?: string;
}

/** Resposta 201 do envio: a única vez em que a chave aparece. `receivedOn` só com o dia. */
export interface ProvisionalReportReceipt {
  readonly protocol: string;
  readonly accessKey: string;
  readonly receivedOn: string;
}

/** Resposta da API fora do formato esperado. A mensagem nunca repete o conteúdo recebido. */
export class InvalidApiResponseError extends Error {
  constructor(what: string) {
    super(`Resposta da API fora do formato esperado: ${what}`);
    this.name = 'InvalidApiResponseError';
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isFilledText = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export function toCategories(body: unknown): ProvisionalCategory[] {
  if (!Array.isArray(body)) throw new InvalidApiResponseError('categorias');
  return body.map((item) => {
    if (
      !isRecord(item) ||
      !isFilledText(item['code']) ||
      !isFilledText(item['name']) ||
      !(item['description'] === null || typeof item['description'] === 'string')
    ) {
      throw new InvalidApiResponseError('categoria');
    }
    return { code: item['code'], name: item['name'], description: item['description'] };
  });
}

export function toReceipt(body: unknown): ProvisionalReportReceipt {
  if (
    !isRecord(body) ||
    !isFilledText(body['protocol']) ||
    !isFilledText(body['accessKey']) ||
    typeof body['receivedOn'] !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body['receivedOn'])
  ) {
    throw new InvalidApiResponseError('comprovante');
  }
  return {
    protocol: body['protocol'],
    accessKey: body['accessKey'],
    receivedOn: body['receivedOn'],
  };
}
