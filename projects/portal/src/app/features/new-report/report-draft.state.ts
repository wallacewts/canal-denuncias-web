import { Injectable, type OnDestroy, inject } from '@angular/core';
import {
  type AbstractControl,
  type FormArray,
  type FormControl,
  type FormGroup,
  NonNullableFormBuilder,
  type ValidationErrors,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import type { DataType, ReporterType } from './report-submission.types';

/** Limites iguais aos da API (REP-02): o navegador valida por conveniência, a API valida de novo. */
export const DESCRIPTION_MIN = 100;
export const DESCRIPTION_MAX = 10_000;
export const TEXT_MAX = 2_000;
export const MAX_INVOLVED = 20;

export type OccurredKind = 'none' | 'date' | 'month';

export interface InvolvedValue {
  name: string;
  role: string;
}

export interface ReportDraftValue {
  reporterType: { type: ReporterType | null };
  category: { code: string | null };
  content: {
    description: string;
    occurredKind: OccurredKind;
    occurredDate: string;
    occurredMonth: string;
    occurredYear: string;
    location: string;
    affectedSystems: string;
    dataTypes: DataType[];
    howKnown: string;
    evidenceNotes: string;
  };
  involved: InvolvedValue[];
}

export type DraftStepKey = keyof ReportDraftValue;

export function emptyDraftValue(): ReportDraftValue {
  return {
    reporterType: { type: null },
    category: { code: null },
    content: {
      description: '',
      occurredKind: 'none',
      occurredDate: '',
      occurredMonth: '',
      occurredYear: '',
      location: '',
      affectedSystems: '',
      dataTypes: [],
      howKnown: '',
      evidenceNotes: '',
    },
    involved: [],
  };
}

const notBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.length > 0 && control.value.trim() === ''
    ? { blank: true }
    : null;

const pad = (n: number) => String(n).padStart(2, '0');

/** Data de hoje no fuso do navegador, como `AAAA-MM-DD` (o mesmo formato do `<input type="date">`). */
export function localToday(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "Quando aconteceu": completo quando escolhido e nunca no futuro (PNEW-04). */
const occurredValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const v = group.value as ReportDraftValue['content'];
  const today = localToday();
  if (v.occurredKind === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.occurredDate)) return { occurredIncomplete: true };
    return v.occurredDate > today ? { futureDate: true } : null;
  }
  if (v.occurredKind === 'month') {
    if (!/^\d{2}$/.test(v.occurredMonth) || !/^\d{4}$/.test(v.occurredYear))
      return { occurredIncomplete: true };
    return `${v.occurredYear}-${v.occurredMonth}` > today.slice(0, 7) ? { futureDate: true } : null;
  }
  return null;
};

type InvolvedGroup = FormGroup<{ name: FormControl<string>; role: FormControl<string> }>;

/**
 * Rascunho da denúncia (PNEW-01), SÓ em memória e com escopo de tela: fornecido pelo `NewReportFlow`
 * (`providers: [ReportDraftState]`) e descartado quando o fluxo é destruído (research.md R3, D35).
 * Um formulário tipado com um subgrupo por etapa (research.md R4).
 */
@Injectable()
export class ReportDraftState implements OnDestroy {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group({
    reporterType: this.fb.group({
      type: this.fb.control<ReporterType | null>(null, Validators.required),
    }),
    category: this.fb.group({
      code: this.fb.control<string | null>(null, Validators.required),
    }),
    content: this.fb.group(
      {
        description: this.fb.control('', [
          Validators.required,
          Validators.minLength(DESCRIPTION_MIN),
          Validators.maxLength(DESCRIPTION_MAX),
          notBlank,
        ]),
        occurredKind: this.fb.control<OccurredKind>('none'),
        occurredDate: this.fb.control(''),
        occurredMonth: this.fb.control(''),
        occurredYear: this.fb.control(''),
        location: this.fb.control('', Validators.maxLength(TEXT_MAX)),
        affectedSystems: this.fb.control('', Validators.maxLength(TEXT_MAX)),
        dataTypes: this.fb.control<DataType[]>([]),
        howKnown: this.fb.control('', Validators.maxLength(TEXT_MAX)),
        evidenceNotes: this.fb.control('', Validators.maxLength(TEXT_MAX)),
      },
      { validators: occurredValidator },
    ),
    involved: this.fb.array<InvolvedGroup>([], Validators.maxLength(MAX_INVOLVED)),
  });

  private readonly initial = JSON.stringify(emptyDraftValue());

  /** A etapa está completa quando o seu subgrupo é válido. */
  isComplete(step: DraftStepKey): boolean {
    return this.form.controls[step].valid;
  }

  /** Algum campo foi preenchido: liga o aviso de saída (research.md R6). */
  hasData(): boolean {
    return JSON.stringify(this.form.getRawValue()) !== this.initial;
  }

  value(): ReportDraftValue {
    return this.form.getRawValue() as ReportDraftValue;
  }

  get involved(): FormArray<InvolvedGroup> {
    return this.form.controls.involved;
  }

  /** Adiciona uma linha de envolvido. Devolve false no limite de 20. */
  addInvolved(): boolean {
    if (this.involved.length >= MAX_INVOLVED) return false;
    this.involved.push(
      this.fb.group({
        name: this.fb.control('', Validators.maxLength(TEXT_MAX)),
        role: this.fb.control('', Validators.maxLength(TEXT_MAX)),
      }),
    );
    return true;
  }

  removeInvolved(index: number): void {
    this.involved.removeAt(index);
  }

  /** Apaga o rascunho inteiro. */
  clear(): void {
    this.involved.clear();
    this.form.reset();
  }

  ngOnDestroy(): void {
    this.clear();
  }
}
