import { TestBed } from '@angular/core/testing';
import { MAX_INVOLVED, ReportDraftState } from './report-draft.state';

describe('ReportDraftState', () => {
  let state: ReportDraftState;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 28, 12, 0, 0));
    TestBed.configureTestingModule({ providers: [ReportDraftState] });
    state = TestBed.inject(ReportDraftState);
  });

  afterEach(() => vi.useRealTimers());

  const content = () => state.form.controls.content;
  const description = () => content().controls.description;

  it('começa vazio, sem dados e com as etapas obrigatórias incompletas', () => {
    expect(state.hasData()).toBe(false);
    expect(state.isComplete('reporterType')).toBe(false);
    expect(state.isComplete('category')).toBe(false);
    expect(state.isComplete('content')).toBe(false);
    expect(state.isComplete('involved')).toBe(true);
  });

  it.each([
    [99, false],
    [100, true],
    [10_000, true],
    [10_001, false],
  ])('descrição com %i caracteres: válida = %s', (length, valid) => {
    description().setValue('x'.repeat(length));
    expect(description().valid).toBe(valid);
  });

  it('descrição só com espaços é recusada', () => {
    description().setValue(' '.repeat(100));
    expect(description().valid).toBe(false);
  });

  it.each(['location', 'affectedSystems', 'howKnown', 'evidenceNotes'] as const)(
    '%s aceita 2.000 caracteres e recusa 2.001',
    (field) => {
      const control = content().controls[field];
      control.setValue('y'.repeat(2_000));
      expect(control.valid).toBe(true);
      control.setValue('y'.repeat(2_001));
      expect(control.valid).toBe(false);
    },
  );

  it('data exata futura é recusada; hoje é aceita', () => {
    description().setValue('x'.repeat(100));
    content().patchValue({ occurredKind: 'date', occurredDate: '2026-11-29' });
    expect(content().hasError('futureDate')).toBe(true);
    content().patchValue({ occurredDate: '2026-11-28' });
    expect(content().valid).toBe(true);
  });

  it('mês futuro é recusado; o mês atual é aceito', () => {
    description().setValue('x'.repeat(100));
    content().patchValue({ occurredKind: 'month', occurredMonth: '12', occurredYear: '2026' });
    expect(content().hasError('futureDate')).toBe(true);
    content().patchValue({ occurredMonth: '11' });
    expect(content().valid).toBe(true);
  });

  it('"quando aconteceu" escolhido mas incompleto é recusado', () => {
    description().setValue('x'.repeat(100));
    content().patchValue({ occurredKind: 'month', occurredMonth: '05', occurredYear: '' });
    expect(content().hasError('occurredIncomplete')).toBe(true);
  });

  it('aceita até 20 envolvidos e recusa o 21º', () => {
    for (let i = 0; i < MAX_INVOLVED; i++) expect(state.addInvolved()).toBe(true);
    expect(state.addInvolved()).toBe(false);
    expect(state.form.controls.involved.length).toBe(MAX_INVOLVED);
  });

  it('nome e função de envolvido aceitam 2.000 e recusam 2.001 caracteres', () => {
    state.addInvolved();
    const row = state.form.controls.involved.at(0);
    row.controls.name.setValue('n'.repeat(2_001));
    expect(row.valid).toBe(false);
    row.controls.name.setValue('n'.repeat(2_000));
    expect(row.valid).toBe(true);
  });

  it('marca "rascunho com dados" ao preencher qualquer campo, inclusive um curto', () => {
    content().controls.location.setValue('a');
    expect(state.hasData()).toBe(true);
  });

  it('clear() volta ao estado inicial e apaga os envolvidos', () => {
    state.form.controls.reporterType.controls.type.setValue('EMPLOYEE');
    description().setValue('x'.repeat(100));
    state.addInvolved();
    state.clear();
    expect(state.hasData()).toBe(false);
    expect(state.form.controls.involved.length).toBe(0);
    expect(description().value).toBe('');
  });

  it('descarta o rascunho quando a tela é destruída', () => {
    description().setValue('relato');
    state.ngOnDestroy();
    expect(state.hasData()).toBe(false);
  });
});
