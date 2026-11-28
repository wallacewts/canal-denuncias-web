import type { ApiError } from '../api/generated/public/models';

/**
 * Erro lido de uma resposta da API. Derivado do modelo `ApiError` gerado de `openapi/public.json` (TRV-01), com só o
 * que a interface precisa ler. Não guarda o `message` da API, que pode ser técnico ou conter trechos do que a pessoa
 * enviou. `error` e `requestId` podem faltar quando a resposta vem fora do formato (proxy, falha de rede).
 */
export type ParsedApiError = Readonly<
  Pick<ApiError, 'statusCode'> & {
    error: ApiError['error'] | null;
    requestId: ApiError['requestId'] | null;
  }
>;

const textOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

/**
 * Valida o corpo de erro em tempo de execução. Resposta sem corpo, fora do formato ou falha de rede (status 0) viram
 * um erro só com o status.
 */
export function toApiError(status: number, body: unknown): ParsedApiError {
  const record =
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null;
  return {
    statusCode: status,
    error: textOrNull(record?.['error']),
    requestId: textOrNull(record?.['requestId']),
  };
}
