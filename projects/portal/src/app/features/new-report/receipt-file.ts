import { formatAppDate } from '@canal/shared';
import { downloadTextFile } from '@canal/shared/files';
import type { ProvisionalReportReceipt } from './report-submission.types';

/** Nome fixo: nunca leva protocolo nem chave (FR-035). */
export const RECEIPT_FILE_NAME = 'comprovante-denuncia.txt';

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

/** Baixa o comprovante gerado no próprio navegador, com o nome fixo (FR-035). */
export function downloadReceipt(receipt: ProvisionalReportReceipt, doc: Document = document): void {
  downloadTextFile(RECEIPT_FILE_NAME, buildReceiptText(receipt), doc);
}
