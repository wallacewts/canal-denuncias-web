import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ReportDraftState } from '../report-draft.state';
import { DescriptionStep } from './description-step';

function setup() {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 28, 12));
  TestBed.configureTestingModule({
    imports: [DescriptionStep],
    providers: [ReportDraftState, provideRouter([])],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(DescriptionStep);
  fixture.detectChanges();
  return {
    fixture,
    navigate,
    draft: TestBed.inject(ReportDraftState),
    el: fixture.nativeElement as HTMLElement,
  };
}

const type = (el: HTMLTextAreaElement | HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event('input'));
};

describe('DescriptionStep', () => {
  afterEach(() => vi.useRealTimers());

  it('contador mostra o tamanho e está ligado ao campo da descrição', () => {
    const { fixture, el } = setup();
    const textarea = el.querySelector<HTMLTextAreaElement>('textarea#description')!;
    type(textarea, 'abc');
    fixture.detectChanges();
    const counter = el.querySelector('#description-counter')!;
    expect(counter.textContent).toContain('3 de 10.000 caracteres');
    expect(textarea.getAttribute('aria-describedby')).toContain('description-counter');
  });

  it('descrição curta mostra o erro ligado ao campo e não avança', () => {
    const { fixture, el, navigate } = setup();
    type(el.querySelector<HTMLTextAreaElement>('textarea#description')!, 'curto');
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    fixture.detectChanges();
    expect(navigate).not.toHaveBeenCalled();
    expect(el.textContent).toContain('pelo menos 100 caracteres');
    expect(el.querySelector('textarea#description')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('campos de texto livre sem preenchimento automático', () => {
    const { el } = setup();
    for (const field of el.querySelectorAll('textarea, input[type=text]')) {
      expect(field.getAttribute('autocomplete')).toBe('off');
    }
  });

  it('"Data exata" mostra o campo de data com máximo igual a hoje', () => {
    const { fixture, el, draft } = setup();
    draft.form.controls.content.controls.occurredKind.setValue('date');
    fixture.detectChanges();
    expect(el.querySelector<HTMLInputElement>('input[type=date]')!.max).toBe('2026-11-28');
  });

  it('"Só mês e ano" mostra os selects de mês e ano, com o ano atual primeiro', () => {
    const { fixture, el, draft } = setup();
    draft.form.controls.content.controls.occurredKind.setValue('month');
    fixture.detectChanges();
    const year = el.querySelector<HTMLSelectElement>('select#occurred-year')!;
    expect(el.querySelector('select#occurred-month')).not.toBeNull();
    expect(year.options[1].value).toBe('2026');
  });

  it('tipos de dados em seleção múltipla', () => {
    const { fixture, el, draft } = setup();
    const boxes = [...el.querySelectorAll<HTMLInputElement>('input[type=checkbox]')];
    expect(boxes).toHaveLength(4);
    boxes[0].click();
    boxes[2].click();
    fixture.detectChanges();
    expect(draft.form.controls.content.controls.dataTypes.value).toEqual([
      'PERSONAL',
      'CREDENTIALS',
    ]);
  });

  it('orienta a descrever fatos e a não incluir dados que identifiquem quem denuncia', () => {
    const { el } = setup();
    expect(el.textContent).toContain('Descreva fatos');
    expect(el.textContent).toContain('não inclua dados que identifiquem você');
  });

  it('com a descrição válida, avança para os envolvidos', () => {
    const { fixture, el, navigate } = setup();
    type(el.querySelector<HTMLTextAreaElement>('textarea#description')!, 'x'.repeat(100));
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith(['../envolvidos'], expect.anything());
  });
});
