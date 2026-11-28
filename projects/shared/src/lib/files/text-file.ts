const REVOKE_DELAY_MS = 1_000;

/**
 * Gera um arquivo de texto no próprio navegador, sem chamada ao servidor (feature 002 R7, feature 004 R7). `Blob` e
 * âncora com `download`: não usa nenhum sink de Trusted Types nem precisa mudar a CSP. A URL é liberada um instante
 * depois do clique: liberar na hora pode cancelar o download em alguns navegadores (Firefox). O nome do arquivo é
 * escolhido por quem chama e nunca deve levar dado sensível.
 */
export function downloadTextFile(fileName: string, text: string, doc: Document = document): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
