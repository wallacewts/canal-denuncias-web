import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MAX_INVOLVED, ReportDraftState } from '../report-draft.state';
import { InvolvedStep } from './involved-step';

async function setup() {
  TestBed.configureTestingModule({
    imports: [InvolvedStep],
    providers: [ReportDraftState, provideRouter([])],
  });
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(InvolvedStep);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!;
  const click = async (b: HTMLButtonElement) => {
    b.click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { fixture, el, button, click, draft: TestBed.inject(ReportDraftState) };
}

describe('InvolvedStep', () => {
  it('é opcional: sem envolvidos, a etapa está completa', async () => {
    const { draft } = await setup();
    expect(draft.isComplete('involved')).toBe(true);
  });

  it('adicionar leva o foco para o nome da linha nova', async () => {
    const { el, button, click } = await setup();
    await click(button('Adicionar envolvido'));
    await click(button('Adicionar envolvido'));
    expect(document.activeElement).toBe(el.querySelector('#involved-name-1'));
  });

  it('remover leva o foco para a linha seguinte, senão para a anterior, senão para "Adicionar"', async () => {
    const { el, button, click } = await setup();
    for (let i = 0; i < 3; i++) await click(button('Adicionar envolvido'));
    await click(button('Remover envolvido 2'));
    expect(document.activeElement).toBe(el.querySelector('#involved-name-1')); // a antiga 3ª linha
    await click(button('Remover envolvido 2'));
    expect(document.activeElement).toBe(el.querySelector('#involved-name-0'));
    await click(button('Remover envolvido 1'));
    expect(document.activeElement).toBe(button('Adicionar envolvido'));
  });

  it('no limite de 20, o botão de adicionar fica indisponível e explica o limite', async () => {
    const { el, button, click, draft } = await setup();
    for (let i = 0; i < MAX_INVOLVED; i++) draft.addInvolved();
    await click(button('Continuar'));
    expect(button('Adicionar envolvido').disabled).toBe(true);
    expect(el.textContent).toContain('no máximo 20 envolvidos');
  });
});
