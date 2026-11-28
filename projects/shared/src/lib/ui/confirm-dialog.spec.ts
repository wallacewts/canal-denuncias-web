import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog } from './confirm-dialog';

const OPTIONS = {
  title: 'Concluir denúncia?',
  message: 'A denúncia será marcada como concluída.',
  confirmLabel: 'Concluir',
  cancelLabel: 'Voltar',
};

function button(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === label,
  );
  if (!found) throw new Error(`botão "${label}" não encontrado`);
  return found;
}

describe('ConfirmDialog', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let dialog: ConfirmDialog;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm');
    dialog = TestBed.inject(ConfirmDialog);
  });

  afterEach(() => {
    expect(confirmSpy).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('mostra título e mensagem e devolve true ao confirmar', async () => {
    const result = firstValueFrom(dialog.open(OPTIONS));
    await vi.waitFor(() => button('Concluir'));
    expect(document.body.textContent).toContain('Concluir denúncia?');
    expect(document.body.textContent).toContain('A denúncia será marcada como concluída.');
    button('Concluir').click();
    expect(await result).toBe(true);
  });

  it('devolve false ao cancelar', async () => {
    const result = firstValueFrom(dialog.open(OPTIONS));
    await vi.waitFor(() => button('Voltar'));
    button('Voltar').click();
    expect(await result).toBe(false);
  });

  it('devolve false ao fechar com Esc', async () => {
    const result = firstValueFrom(dialog.open(OPTIONS));
    await vi.waitFor(() => button('Voltar'));
    // A CDK reconhece o Esc pelo keyCode 27.
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
    );
    expect(await result).toBe(false);
  });
});
