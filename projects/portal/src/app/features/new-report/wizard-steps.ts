import type { DraftStepKey } from './report-draft.state';

export interface WizardStep {
  /** Segmento da rota, filho de `/nova-denuncia`. A URL só leva o nome da etapa (FR-002). */
  readonly path: string;
  readonly title: string;
  /** Etapa obrigatória: não pode ser pulada pela URL (FR-003). */
  readonly required: boolean;
  /** Subgrupo do rascunho que a etapa preenche; a revisão não tem. */
  readonly groupKey: DraftStepKey | null;
}

/**
 * Tabela única das etapas do wizard (research.md R5), usada pelo indicador de progresso, pelo controle de etapas
 * puladas e pelos links de edição da revisão. Anexos e identificação ficam de fora até PNEW-07 e PNEW-08 (FR-008).
 */
export const WIZARD_STEPS: readonly WizardStep[] = [
  { path: 'tipo', title: 'Tipo de denunciante', required: true, groupKey: 'reporterType' },
  { path: 'categoria', title: 'Categoria', required: true, groupKey: 'category' },
  { path: 'relato', title: 'Relato', required: true, groupKey: 'content' },
  { path: 'envolvidos', title: 'Envolvidos', required: false, groupKey: 'involved' },
  { path: 'revisao', title: 'Revisão', required: false, groupKey: null },
];

export const PROTOCOL_PATH = 'protocolo';
