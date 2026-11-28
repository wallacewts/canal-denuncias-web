import { Component, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormFieldError, PageHeader, SensitiveInput } from '@canal/shared';
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  ReportDraftState,
  TEXT_MAX,
  localToday,
} from '../report-draft.state';
import { DATA_TYPES, type DataType } from '../report-submission.types';
import { STEP_STYLES } from './step-styles';

const DATA_TYPE_LABELS: Record<DataType, string> = {
  PERSONAL: 'Dados pessoais',
  FINANCIAL: 'Dados financeiros',
  CREDENTIALS: 'Credenciais (senhas, chaves de acesso)',
  OTHER: 'Outros',
};

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const OPTIONAL_FIELDS = [
  { key: 'location', label: 'Onde aconteceu', multiline: false },
  { key: 'affectedSystems', label: 'Sistemas afetados', multiline: false },
  { key: 'howKnown', label: 'Como você soube', multiline: true },
  { key: 'evidenceNotes', label: 'Evidências', multiline: true },
] as const;

/** Etapa 3 (PNEW-04): relato. Campos de `ReportContentV1`, com os limites de REP-02. */
@Component({
  selector: 'app-description-step',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    RouterLink,
    PageHeader,
    FormFieldError,
    SensitiveInput,
  ],
  template: `
    <lib-page-header title="Relato" />
    <p class="guidance">
      Descreva fatos: o que aconteceu, quando e onde. Se quiser ficar anônimo, não inclua dados que
      identifiquem você, como seu nome, sua função ou detalhes que só você saberia.
    </p>
    <form [formGroup]="group" (ngSubmit)="next()" novalidate>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Descrição</mat-label>
        <textarea
          matInput
          id="description"
          formControlName="description"
          rows="8"
          appSensitiveInput
          [spellcheckAllowed]="true"
          [aria-describedby]="descriptionDescribedBy()"
        ></textarea>
      </mat-form-field>
      <p id="description-counter" class="counter">
        {{ count(descriptionLength()) }} de {{ count(max) }} caracteres (mínimo de {{ min }})
      </p>
      <lib-form-field-error
        #descriptionError
        [control]="group.controls.description"
        [messages]="descriptionMessages"
      />

      <fieldset>
        <legend id="occurred-legend">Quando aconteceu?</legend>
        <mat-radio-group
          class="options"
          formControlName="occurredKind"
          aria-labelledby="occurred-legend"
        >
          <mat-radio-button value="none">Não sei ou prefiro não informar</mat-radio-button>
          <mat-radio-button value="date">Data exata</mat-radio-button>
          <mat-radio-button value="month">Só mês e ano</mat-radio-button>
        </mat-radio-group>
        @if (kind() === 'date') {
          <mat-form-field appearance="outline">
            <mat-label>Data</mat-label>
            <input
              matInput
              type="date"
              formControlName="occurredDate"
              [max]="today"
              [aria-describedby]="occurredDescribedBy()"
            />
          </mat-form-field>
        } @else if (kind() === 'month') {
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Mês</mat-label>
              <select
                matNativeControl
                id="occurred-month"
                formControlName="occurredMonth"
                [aria-describedby]="occurredDescribedBy()"
              >
                <option value="">Selecione</option>
                @for (month of months; track month; let i = $index) {
                  <option [value]="pad(i + 1)">{{ month }}</option>
                }
              </select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Ano</mat-label>
              <select
                matNativeControl
                id="occurred-year"
                formControlName="occurredYear"
                [aria-describedby]="occurredDescribedBy()"
              >
                <option value="">Selecione</option>
                @for (year of years; track year) {
                  <option [value]="year">{{ year }}</option>
                }
              </select>
            </mat-form-field>
          </div>
        }
        <lib-form-field-error #occurredError [control]="group" [messages]="occurredMessages" />
      </fieldset>

      <fieldset>
        <legend>Que tipos de dados estão envolvidos?</legend>
        <div class="options">
          @for (type of dataTypes; track type) {
            <mat-checkbox [checked]="isChecked(type)" (change)="toggle(type, $event.checked)">
              {{ labels[type] }}
            </mat-checkbox>
          }
        </div>
      </fieldset>

      @for (field of optionalFields; track field.key) {
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ field.label }} (opcional)</mat-label>
          @if (field.multiline) {
            <textarea
              matInput
              [formControlName]="field.key"
              rows="3"
              appSensitiveInput
              [spellcheckAllowed]="true"
            ></textarea>
          } @else {
            <input matInput type="text" [formControlName]="field.key" appSensitiveInput />
          }
          <mat-hint align="end">Até {{ count(textMax) }} caracteres</mat-hint>
          @if (group.controls[field.key].hasError('maxlength')) {
            <mat-error>Use no máximo {{ count(textMax) }} caracteres.</mat-error>
          }
        </mat-form-field>
      }

      <div class="actions">
        <a mat-button routerLink="../categoria">Voltar</a>
        <button mat-flat-button type="submit">Continuar</button>
      </div>
    </form>
  `,
  styles: [
    STEP_STYLES,
    `
      .full {
        width: 100%;
      }
      .guidance {
        max-width: 65ch;
      }
      .counter {
        margin: -0.75rem 0 0;
        font: var(--mat-sys-body-small);
        color: var(--mat-sys-on-surface-variant);
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 0 1rem;
      }
      fieldset {
        margin-block: 1rem;
      }
    `,
  ],
})
export class DescriptionStep {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly group = inject(ReportDraftState).form.controls.content;
  protected readonly min = DESCRIPTION_MIN;
  protected readonly max = DESCRIPTION_MAX;
  protected readonly textMax = TEXT_MAX;
  protected readonly today = localToday();
  protected readonly months = MONTHS;
  protected readonly years = Array.from({ length: 20 }, (_, i) =>
    String(new Date().getFullYear() - i),
  );
  protected readonly dataTypes = DATA_TYPES;
  protected readonly labels = DATA_TYPE_LABELS;
  protected readonly optionalFields = OPTIONAL_FIELDS;
  protected readonly descriptionMessages = {
    required: 'Descreva o que aconteceu.',
    minlength: `Escreva pelo menos ${DESCRIPTION_MIN} caracteres, para a equipe conseguir apurar.`,
    maxlength: 'Use no máximo 10.000 caracteres.',
    blank: 'Descreva o que aconteceu.',
  };
  protected readonly occurredMessages = {
    occurredIncomplete: 'Complete a data ou escolha outra opção.',
    futureDate: 'A data não pode estar no futuro.',
  };

  private readonly descriptionError = viewChild<FormFieldError>('descriptionError');
  private readonly occurredError = viewChild<FormFieldError>('occurredError');

  private readonly value = toSignal(this.group.valueChanges, {
    initialValue: this.group.getRawValue(),
  });
  protected readonly kind = computed(() => this.value().occurredKind);
  protected readonly descriptionLength = computed(() => (this.value().description ?? '').length);

  /**
   * Contador sempre; a mensagem de erro quando visível. A visibilidade é calculada do próprio controle (mesma regra do
   * FormFieldError), porque o campo vem antes da mensagem no template e é avaliado primeiro.
   */
  protected descriptionDescribedBy(): string {
    const control = this.group.controls.description;
    const id = this.descriptionError()?.id;
    return id && control.invalid && (control.touched || control.dirty)
      ? `description-counter ${id}`
      : 'description-counter';
  }

  protected occurredDescribedBy(): string {
    const id = this.occurredError()?.id;
    const visible = !!this.group.errors && (this.group.touched || this.group.dirty);
    return id && visible ? id : '';
  }

  private readonly numberFormat = new Intl.NumberFormat('pt-BR');

  protected count(n: number): string {
    return this.numberFormat.format(n);
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  protected isChecked(type: DataType): boolean {
    return this.group.controls.dataTypes.value.includes(type);
  }

  protected toggle(type: DataType, checked: boolean): void {
    const current = this.group.controls.dataTypes.value.filter((t) => t !== type);
    const next = checked ? [...current, type] : current;
    this.group.controls.dataTypes.setValue(DATA_TYPES.filter((t) => next.includes(t)));
    this.group.controls.dataTypes.markAsDirty();
  }

  protected next(): void {
    if (this.group.invalid) {
      this.group.markAllAsTouched();
      return;
    }
    void this.router.navigate(['../envolvidos'], { relativeTo: this.route });
  }
}
