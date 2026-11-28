import type { ReportDraftValue } from './report-draft.state';
import type { ProvisionalInvolved, ProvisionalReportSubmission } from './report-submission.types';

const filled = (v: string) => v.trim().length > 0;

/**
 * Monta o corpo de `POST /api/public/v1/reports` a partir do rascunho (data-model.md). Só os campos previstos em
 * REP-02; opcionais vazios não são enviados; textos vão como digitados. Nunca inclui identificação.
 */
export function toSubmission(draft: ReportDraftValue): ProvisionalReportSubmission {
  const { type } = draft.reporterType;
  const { code } = draft.category;
  if (!type || !code)
    throw new Error('Rascunho incompleto: tipo de denunciante e categoria são obrigatórios.');
  const c = draft.content;

  const occurredOn =
    c.occurredKind === 'date'
      ? c.occurredDate
      : c.occurredKind === 'month'
        ? `${c.occurredYear}-${c.occurredMonth}`
        : '';

  const involved: ProvisionalInvolved[] = draft.involved
    .filter((p) => filled(p.name) || filled(p.role))
    .map((p) => ({
      ...(filled(p.name) ? { name: p.name } : {}),
      ...(filled(p.role) ? { role: p.role } : {}),
    }));

  return {
    reporterType: type,
    categoryCode: code,
    description: c.description,
    ...(occurredOn ? { occurredOn } : {}),
    ...(filled(c.location) ? { location: c.location } : {}),
    ...(filled(c.affectedSystems) ? { affectedSystems: c.affectedSystems } : {}),
    ...(c.dataTypes.length ? { dataTypes: [...c.dataTypes] } : {}),
    ...(involved.length ? { involved } : {}),
    ...(filled(c.howKnown) ? { howKnown: c.howKnown } : {}),
    ...(filled(c.evidenceNotes) ? { evidenceNotes: c.evidenceNotes } : {}),
  };
}
