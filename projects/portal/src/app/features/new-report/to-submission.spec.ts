import { emptyDraftValue, type ReportDraftValue } from './report-draft.state';
import { toSubmission } from './to-submission';

function draft(
  patch: Partial<ReportDraftValue['content']> = {},
  involved: ReportDraftValue['involved'] = [],
) {
  const value = emptyDraftValue();
  return {
    ...value,
    reporterType: { type: 'PARTNER' as const },
    category: { code: 'DATA_LEAK' },
    content: { ...value.content, description: 'Relato curto: <b>&"\n', ...patch },
    involved,
  } satisfies ReportDraftValue;
}

describe('toSubmission', () => {
  it('envia só os campos previstos e omite os opcionais vazios', () => {
    expect(toSubmission(draft())).toEqual({
      reporterType: 'PARTNER',
      categoryCode: 'DATA_LEAK',
      description: 'Relato curto: <b>&"\n',
    });
  });

  it('envia os textos como digitados, sem cortar', () => {
    const body = toSubmission(draft({ location: '  sala 3  ', howKnown: 'vi' }));
    expect(body.location).toBe('  sala 3  ');
    expect(body.howKnown).toBe('vi');
  });

  it('omite texto opcional só com espaços', () => {
    expect(toSubmission(draft({ evidenceNotes: '   ' }))).not.toHaveProperty('evidenceNotes');
  });

  it('data exata vira AAAA-MM-DD', () => {
    const body = toSubmission(draft({ occurredKind: 'date', occurredDate: '2026-10-05' }));
    expect(body.occurredOn).toBe('2026-10-05');
  });

  it('mês e ano viram AAAA-MM', () => {
    const body = toSubmission(
      draft({ occurredKind: 'month', occurredMonth: '03', occurredYear: '2025' }),
    );
    expect(body.occurredOn).toBe('2025-03');
  });

  it('sem "quando aconteceu" não envia occurredOn, mesmo com valores antigos preenchidos', () => {
    const body = toSubmission(draft({ occurredKind: 'none', occurredDate: '2026-10-05' }));
    expect(body).not.toHaveProperty('occurredOn');
  });

  it('envia os tipos de dados escolhidos e omite a lista vazia', () => {
    expect(toSubmission(draft({ dataTypes: ['PERSONAL', 'OTHER'] })).dataTypes).toEqual([
      'PERSONAL',
      'OTHER',
    ]);
    expect(toSubmission(draft({ dataTypes: [] }))).not.toHaveProperty('dataTypes');
  });

  it('envia envolvidos sem linhas totalmente vazias e sem campos vazios', () => {
    const body = toSubmission(
      draft({}, [
        { name: 'Ana', role: '' },
        { name: '', role: '' },
        { name: '', role: 'TI' },
      ]),
    );
    expect(body.involved).toEqual([{ name: 'Ana' }, { role: 'TI' }]);
  });

  it('nunca envia campo de identificação', () => {
    const body = toSubmission(draft()) as unknown as Record<string, unknown>;
    expect(Object.keys(body).some((k) => /identi|name|contact|email/i.test(k))).toBe(false);
  });

  it('recusa montar o corpo sem tipo ou categoria', () => {
    const value = draft();
    expect(() => toSubmission({ ...value, reporterType: { type: null } })).toThrow();
    expect(() => toSubmission({ ...value, category: { code: null } })).toThrow();
  });
});
