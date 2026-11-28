import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { ReportDraftState } from '../report-draft.state';
import { ReporterTypeStep } from './reporter-type-step';

function setup() {
  TestBed.configureTestingModule({
    imports: [ReporterTypeStep],
    providers: [ReportDraftState, provideRouter([])],
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ReporterTypeStep);
  fixture.detectChanges();
  return {
    fixture,
    navigate,
    draft: TestBed.inject(ReportDraftState),
    el: fixture.nativeElement as HTMLElement,
  };
}

describe('ReporterTypeStep', () => {
  it('oferece Colaborador, Parceiro e Terceiro e explica que a escolha não identifica', () => {
    const { el } = setup();
    expect(el.textContent).toContain('Colaborador');
    expect(el.textContent).toContain('Parceiro');
    expect(el.textContent).toContain('Terceiro');
    expect(el.textContent).toContain('não identifica você');
  });

  it.each([
    ['Colaborador', 'EMPLOYEE'],
    ['Parceiro', 'PARTNER'],
    ['Terceiro', 'THIRD_PARTY'],
  ])('%s grava o código %s', (label, code) => {
    const { fixture, el, draft } = setup();
    const radio = [...el.querySelectorAll<HTMLInputElement>('input[type=radio]')].find((r) =>
      r.closest('mat-radio-button')?.textContent?.includes(label),
    );
    radio?.click();
    fixture.detectChanges();
    expect(draft.form.controls.reporterType.controls.type.value).toBe(code);
  });

  it('sem escolha, "Continuar" mostra o erro e não avança', async () => {
    const { fixture, el, navigate } = setup();
    el.querySelector<HTMLButtonElement>('button[type=submit]')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(navigate).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Escolha uma opção');
  });

  it('com escolha, avança para a categoria', () => {
    const { fixture, el, navigate, draft } = setup();
    draft.form.controls.reporterType.controls.type.setValue('PARTNER');
    el.querySelector<HTMLButtonElement>('button[type=submit]')?.click();
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith(['../categoria'], {
      relativeTo: TestBed.inject(ActivatedRoute),
    });
  });
});
