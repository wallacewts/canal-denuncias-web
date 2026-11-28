import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { ActivatedRoute, Router } from '@angular/router';
import { FieldErrorLink, FormFieldError, PageHeader } from '@canal/shared';
import { ReportDraftState } from '../report-draft.state';
import type { ReporterType } from '../report-submission.types';
import { STEP_STYLES } from './step-styles';

const OPTIONS: readonly { value: ReporterType; label: string; hint: string }[] = [
  { value: 'EMPLOYEE', label: 'Colaborador', hint: 'Você trabalha na empresa.' },
  {
    value: 'PARTNER',
    label: 'Parceiro',
    hint: 'Você trabalha numa empresa ou como prestador ligado ao negócio.',
  },
  { value: 'THIRD_PARTY', label: 'Terceiro', hint: 'Você não tem vínculo com a empresa.' },
];

/** Etapa 1 (PNEW-02): tipo de denunciante. */
@Component({
  selector: 'app-reporter-type-step',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatRadioModule,
    PageHeader,
    FormFieldError,
    FieldErrorLink,
  ],
  template: `
    <lib-page-header title="Tipo de denunciante" />
    <form [formGroup]="group" (ngSubmit)="next()" novalidate>
      <fieldset>
        <legend id="reporter-type-legend">Quem está relatando?</legend>
        <p class="hint">
          A escolha não identifica você. Ela só ajuda a equipe a entender o contexto.
        </p>
        <mat-radio-group
          class="options"
          formControlName="type"
          aria-labelledby="reporter-type-legend"
          [libFieldError]="error"
        >
          @for (option of options; track option.value) {
            <mat-radio-button [value]="option.value">
              {{ option.label }}
              <span class="hint">{{ option.hint }}</span>
            </mat-radio-button>
          }
        </mat-radio-group>
        <lib-form-field-error
          #error
          [control]="group.controls.type"
          [messages]="{ required: 'Escolha uma opção para continuar.' }"
        />
      </fieldset>
      <div class="actions">
        <button mat-flat-button type="submit">Continuar</button>
      </div>
    </form>
  `,
  styles: STEP_STYLES,
})
export class ReporterTypeStep {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly group = inject(ReportDraftState).form.controls.reporterType;
  protected readonly options = OPTIONS;

  protected next(): void {
    if (this.group.invalid) {
      this.group.markAllAsTouched();
      return;
    }
    void this.router.navigate(['../categoria'], { relativeTo: this.route });
  }
}
