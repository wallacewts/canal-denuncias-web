import { RECEIPT_FILE_NAME, buildReceiptText, downloadReceipt } from './receipt-file';

const RECEIPT = { protocol: 'DV-AB12C-3DE45', accessKey: 'AB12-CD34', receivedOn: '2026-11-28' };

describe('receipt-file', () => {
  it('texto com protocolo, chave, data só com o dia e o aviso de que a chave não é recuperável', () => {
    const text = buildReceiptText(RECEIPT);
    expect(text).toContain('DV-AB12C-3DE45');
    expect(text).toContain('AB12-CD34');
    expect(text).toContain('28/11/2026');
    expect(text).toContain('não pode ser recuperada');
  });

  it('nome do arquivo é fixo, sem protocolo nem chave', () => {
    expect(RECEIPT_FILE_NAME).toBe('comprovante-denuncia.txt');
  });

  it('gera o arquivo no navegador, clica no link e libera a URL logo depois', () => {
    vi.useFakeTimers();
    const created: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob);
      return 'blob:local/1';
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('comprovante-denuncia.txt');
      expect(this.getAttribute('href')).toBe('blob:local/1');
    });

    downloadReceipt(RECEIPT);

    expect(created[0].type).toBe('text/plain;charset=utf-8');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:local/1');
    vi.useRealTimers();
    expect(document.querySelector('a[download]')).toBeNull();
    vi.unstubAllGlobals();
    click.mockRestore();
  });
});
