import { downloadTextFile } from './text-file';

describe('downloadTextFile', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('gera o arquivo no navegador, clica no link com o nome pedido e libera a URL logo depois', async () => {
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
      expect(this.download).toBe('arquivo.txt');
      expect(this.href).toBe('blob:local/1');
    });

    downloadTextFile('arquivo.txt', 'XQZ');

    expect(click).toHaveBeenCalledTimes(1);
    expect(await created[0]?.text()).toBe('XQZ');
    expect(created[0]?.type).toBe('text/plain;charset=utf-8');
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:local/1');
  });
});
