import type { Outcome, PublicStatus } from './tracking.types';

/**
 * Textos do status público e do desfecho (research R10). O mapeamento do status interno para o público é da API
 * (PUB-03); aqui só há a tradução do código para o português, sem nenhuma regra de transição.
 */
const STATUS_LABELS: Record<PublicStatus, string> = {
  RECEIVED: 'Recebida',
  IN_REVIEW: 'Em análise',
  AWAITING_REPORTER: 'Aguardando sua resposta',
  CLOSED: 'Encerrada',
  CONCLUDED: 'Concluída',
};

const OUTCOME_LABELS: Record<Outcome, string> = {
  SUBSTANTIATED: 'Procedente',
  PARTIALLY_SUBSTANTIATED: 'Parcialmente procedente',
  UNSUBSTANTIATED: 'Improcedente',
};

/** Código desconhecido vira "Em análise", para nunca quebrar a tela. */
export function statusLabel(status: string): string {
  return STATUS_LABELS[status as PublicStatus] ?? STATUS_LABELS.IN_REVIEW;
}

/** Desfecho desconhecido não é exibido. */
export function outcomeLabel(outcome: string | null): string | null {
  return outcome ? (OUTCOME_LABELS[outcome as Outcome] ?? null) : null;
}

export const MESSAGE_AUTHOR_LABELS = { REPORTER: 'Você', TEAM: 'Equipe de apuração' } as const;
