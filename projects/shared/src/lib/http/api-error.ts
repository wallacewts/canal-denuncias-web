/**
 * PROVISÓRIO: trocar pelo modelo gerado de openapi/public.json (TRV-11), na tarefa T070.
 * Tipo interno com só o que a interface precisa ler do corpo de erro da API (TRV-01). Não é o modelo da API e não
 * guarda o `message` dela, que pode ser técnico ou conter trechos do que a pessoa enviou.
 */
export interface ProvisionalApiError {
  readonly statusCode: number;
  readonly error: string | null;
  readonly requestId: string | null;
}

const textOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

/**
 * Valida o corpo de erro em tempo de execução. Resposta sem corpo, fora do formato ou falha de rede (status 0) viram
 * um erro só com o status.
 */
export function toApiError(status: number, body: unknown): ProvisionalApiError {
  const record =
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null;
  return {
    statusCode: status,
    error: textOrNull(record?.['error']),
    requestId: textOrNull(record?.['requestId']),
  };
}
