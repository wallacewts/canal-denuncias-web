import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ReportDraftState } from '../report-draft.state';
import { ReportSubmissionApi } from '../report-submission.api';
import type { ProvisionalCategory } from '../report-submission.types';
import { CategoryStep } from './category-step';

const CATEGORIES: ProvisionalCategory[] = [
  { code: 'B', name: 'Segunda', description: 'Descrição B' },
  { code: 'A', name: 'Primeira', description: null },
];

function setup(categories: () => ReturnType<ReportSubmissionApi['categories']>) {
  const api = { categories: vi.fn(categories) };
  TestBed.configureTestingModule({
    imports: [CategoryStep],
    providers: [
      ReportDraftState,
      provideRouter([]),
      { provide: ReportSubmissionApi, useValue: api },
    ],
  });
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(CategoryStep);
  fixture.detectChanges();
  return {
    fixture,
    api,
    draft: TestBed.inject(ReportDraftState),
    el: fixture.nativeElement as HTMLElement,
  };
}

describe('CategoryStep', () => {
  it('mostra o carregamento enquanto a lista não chega', () => {
    const pending = new Subject<ProvisionalCategory[]>();
    const { el } = setup(() => pending);
    expect(el.querySelector('lib-loading-state')).not.toBeNull();
  });

  it('mostra nome e descrição na ordem da API', () => {
    const { el } = setup(() => of(CATEGORIES));
    const labels = [...el.querySelectorAll('mat-radio-button')].map((r) => r.textContent ?? '');
    expect(labels[0]).toContain('Segunda');
    expect(labels[0]).toContain('Descrição B');
    expect(labels[1]).toContain('Primeira');
  });

  it('erro: mensagem e "Tentar de novo" busca de novo', () => {
    let calls = 0;
    const { fixture, el, api } = setup(() =>
      ++calls === 1 ? throwError(() => new Error('x')) : of(CATEGORIES),
    );
    expect(el.textContent).toContain('Não foi possível carregar as categorias');
    [...el.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Tentar de novo'))
      ?.click();
    fixture.detectChanges();
    expect(api.categories).toHaveBeenCalledTimes(2);
    expect(el.textContent).toContain('Primeira');
  });

  it('lista vazia: explica e não oferece "Continuar"', () => {
    const { el } = setup(() => of([]));
    expect(el.textContent).toContain('Não é possível enviar uma denúncia agora');
    expect(
      [...el.querySelectorAll('button')].some((b) => b.textContent?.includes('Continuar')),
    ).toBe(false);
  });

  it('escolher uma categoria grava o código e guarda o nome para a revisão', () => {
    const { fixture, el, draft } = setup(() => of(CATEGORIES));
    el.querySelector<HTMLInputElement>('input[type=radio]')?.click();
    fixture.detectChanges();
    expect(draft.form.controls.category.controls.code.value).toBe('B');
    expect(draft.categoryName()).toBe('Segunda');
  });
});
