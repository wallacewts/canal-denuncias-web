import { Component, Injectable, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ScreenState } from './screen-state';

/** Exemplo: rascunho do relato, que só pode existir enquanto a tela está aberta. */
@Injectable()
class DraftState extends ScreenState<{ description: string }> {}

let captured: DraftState | undefined;

@Component({ template: 'Relato', providers: [DraftState] })
class DraftPage {
  constructor() {
    captured = inject(DraftState);
  }
}

@Component({ template: 'Outra tela' })
class OtherPage {}

describe('ScreenState (estado sensível com escopo de rota)', () => {
  beforeEach(() => {
    captured = undefined;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'relato', component: DraftPage },
          { path: 'outra', component: OtherPage },
        ]),
      ],
    });
  });

  it('começa vazio e guarda o valor enquanto a tela está aberta', async () => {
    const harness = await RouterTestingHarness.create('/relato');
    expect(captured?.value()).toBeNull();
    captured?.set({ description: 'x' });
    expect(captured?.value()).toEqual({ description: 'x' });
    harness.detectChanges();
  });

  it('descarta o valor ao sair da tela', async () => {
    const harness = await RouterTestingHarness.create('/relato');
    const state = captured;
    state?.set({ description: 'texto sensível' });

    await harness.navigateByUrl('/outra');

    expect(state?.value()).toBeNull();
  });

  it('cada visita à tela recebe um estado novo', async () => {
    const harness = await RouterTestingHarness.create('/relato');
    const first = captured;
    first?.set({ description: 'a' });
    await harness.navigateByUrl('/outra');
    await harness.navigateByUrl('/relato');

    expect(captured).not.toBe(first);
    expect(captured?.value()).toBeNull();
  });
});
