/**
 * Normaliza o protocolo digitado (PACC-02, research R7): maiúsculas, sem espaços e com os hífens no formato
 * `DV-XXXXX-XXXXX`. O alfabeto não é validado aqui (é regra da API); fora do formato, devolve o texto limpo e a API
 * responde com a mensagem genérica.
 */
export function normalizeProtocol(raw: string): string {
  const compact = raw.toUpperCase().replace(/[\s-]/g, '');
  if (/^DV[0-9A-Z]{10}$/.test(compact)) {
    return `DV-${compact.slice(2, 7)}-${compact.slice(7)}`;
  }
  return compact;
}
