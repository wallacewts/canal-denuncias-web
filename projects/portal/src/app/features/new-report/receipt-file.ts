import { formatAppDate } from '@canal/shared';
import type { ProvisionalReportReceipt } from './report-submission.types';

/** Nome fixo: nunca leva protocolo nem chave (FR-035). */
export const RECEIPT_FILE_NAME = 'comprovante-denuncia.txt';

const REVOKE_DELAY_MS = 1_000;

export function buildReceiptText(receipt: ProvisionalReportReceipt): string {
  return [
    'Canal de Denúncias - comprovante de envio',
    '',
    `Protocolo: ${receipt.protocol}`,
    `Chave de acompanhamento: ${receipt.accessKey}`,
    `Recebida em: ${formatAppDate(receipt.receivedOn, 'dd/MM/yyyy')}`,
    '',
    'Guarde este arquivo em local seguro. A chave não pode ser recuperada:',
    'sem ela, não é possível acompanhar a denúncia.',
    '',
  ].join('\n');
}

/**
 * Gera o arquivo no próprio navegador, sem chamada ao servidor (research.md R7). `Blob` e âncora com `download`: não
 * usa nenhum sink de Trusted Types nem precisa mudar a CSP. A URL é liberada um instante depois do clique: liberar na
 * hora pode cancelar o download em alguns navegadores (Firefox).
 */
export function downloadReceipt(receipt: ProvisionalReportReceipt, doc: Document = document): void {
  const blob = new Blob([buildReceiptText(receipt)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = RECEIPT_FILE_NAME;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
