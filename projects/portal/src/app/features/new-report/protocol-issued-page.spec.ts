import { ConfirmDialog } from '@canal/shared';
import { type Observable, firstValueFrom, of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ProtocolIssuedPage } from './protocol-issued-page';
import { ReceiptState } from './receipt.state';

const RECEIPT = { protocol: 'DV-AB12C-3DE45', accessKey: 'AB12-CD34', receivedOn: '2026-11-28' };

function setup(withReceipt = true) {
  TestBed.configureTestingModule({
    imports: [ProtocolIssuedPage],
    providers: [ReceiptState, provideRouter([])],
  });
  const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const receipt = TestBed.inject(ReceiptState);
  if (withReceipt) receipt.set(RECEIPT);
  const fixture = TestBed.createComponent(ProtocolIssuedPage);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!;
  return { fixture, el, button, navigateByUrl, receipt };
}

describe('ProtocolIssuedPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('mostra protocolo, chave e data só com o dia, a partir da memória', () => {
    const { el } = setup();
    expect(el.querySelector('[data-testid=protocol]')?.textContent).toBe('DV-AB12C-3DE45');
    expect(el.querySelector('[data-testid=access-key]')?.textContent).toBe('AB12-CD34');
    expect(el.querySelector('[data-testid=received-on]')?.textContent).toBe('28/11/2026');
    expect(el.textContent).toContain('Não é possível recuperá-la');
  });

  it('sem comprovante, mostra só o aviso de que não pode mais ser exibido', () => {
    const { el } = setup(false);
    expect(el.textContent).toContain('O protocolo e a chave não podem mais ser exibidos');
    expect(el.querySelector('[data-testid=access-key]')).toBeNull();
  });

  it('"Concluir" exige a marcação; ao concluir, apaga o comprovante e volta ao início', () => {
    const { fixture, el, button, navigateByUrl, receipt } = setup();
    expect(button('Concluir').disabled).toBe(true);
    el.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
    fixture.detectChanges();
    expect(button('Concluir').disabled).toBe(false);
    button('Concluir').click();
    expect(receipt.receipt()).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('copiar: sucesso anunciado', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const { fixture, el, button } = setup();
    button('Copiar protocolo').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(writeText).toHaveBeenCalledWith('DV-AB12C-3DE45');
    expect(el.querySelector('[role=status]')?.textContent).toContain('Protocolo copiado');
  });

  it('copiar sem área de transferência: orienta a copiar manualmente e o valor fica selecionável', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    const { fixture, el, button } = setup();
    button('Copiar chave').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[role=status]')?.textContent).toContain('selecione o texto e copie');
  });

  it('copiar negado pelo navegador: mesma orientação', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('negado')) },
    });
    const { fixture, el, button } = setup();
    button('Copiar chave').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[role=status]')?.textContent).toContain('selecione o texto e copie');
  });
});

describe('ProtocolIssuedPage.canLeave', () => {
  it('sem comprovante, sai sem perguntar', async () => {
    const { fixture } = setup(false);
    const result = fixture.componentInstance.canLeave();
    expect(result).toBe(true);
  });

  it('com comprovante, pergunta; confirmar apaga o comprovante', async () => {
    const { fixture, receipt } = setup();
    const confirm = TestBed.inject(ConfirmDialog);
    vi.spyOn(confirm, 'open').mockReturnValue(of(true));
    const result = fixture.componentInstance.canLeave();
    expect(await firstValueFrom(result as Observable<boolean>)).toBe(true);
    expect(receipt.receipt()).toBeNull();
  });

  it('com comprovante, cancelar mantém', async () => {
    const { fixture, receipt } = setup();
    vi.spyOn(TestBed.inject(ConfirmDialog), 'open').mockReturnValue(of(false));
    expect(await firstValueFrom(fixture.componentInstance.canLeave() as Observable<boolean>)).toBe(
      false,
    );
    expect(receipt.receipt()).not.toBeNull();
  });
});
