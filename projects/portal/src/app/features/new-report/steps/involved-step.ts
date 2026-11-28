import { Component, ElementRef, Injector, afterNextRender, inject, viewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageHeader, SensitiveInput } from '@canal/shared';
import { MAX_INVOLVED, ReportDraftState } from '../report-draft.state';
import { STEP_STYLES } from './step-styles';

/** Etapa 4 (PNEW-05): envolvidos, opcional, até 20, tudo por teclado. */
@Component({
  selector: 'app-involved-step',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
    PageHeader,
    SensitiveInput,
  ],
  template: `
    <lib-page-header
      title="Envolvidos"
      subtitle="Opcional. Informe só o que ajudar a apurar o caso."
    />
    <form [formGroup]="form" (ngSubmit)="next()" novalidate>
      <ol class="rows" formArrayName="involved">
        @for (row of involved.controls; track row; let i = $index) {
          <li [formGroupName]="i" class="row">
            <mat-form-field appearance="outline">
              <mat-label>Nome do envolvido {{ i + 1 }}</mat-label>
              <input
                matInput
                type="text"
                [id]="'involved-name-' + i"
                formControlName="name"
                appSensitiveInput
              />
              @if (row.controls.name.hasError('maxlength')) {
                <mat-error>Use no máximo 2.000 caracteres.</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Função do envolvido {{ i + 1 }}</mat-label>
              <input matInput type="text" formControlName="role" appSensitiveInput />
              @if (row.controls.role.hasError('maxlength')) {
                <mat-error>Use no máximo 2.000 caracteres.</mat-error>
              }
            </mat-form-field>
            <button mat-button type="button" (click)="remove(i)">
              Remover envolvido {{ i + 1 }}
            </button>
          </li>
        }
      </ol>
      <button #addButton mat-stroked-button type="button" [disabled]="atLimit()" (click)="add()">
        Adicionar envolvido
      </button>
      @if (atLimit()) {
        <p class="hint">Você pode informar no máximo {{ max }} envolvidos.</p>
      }
      <div class="actions">
        <a mat-button routerLink="../relato">Voltar</a>
        <button mat-flat-button type="submit">Continuar</button>
      </div>
    </form>
  `,
  styles: [
    STEP_STYLES,
    `
      .rows {
        list-style: none;
        margin: 0 0 1rem;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 0 1rem;
        align-items: center;
      }
      .row mat-form-field {
        flex: 1 1 14rem;
        min-width: 0;
      }
    `,
  ],
})
export class InvolvedStep {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly draft = inject(ReportDraftState);
  private readonly addButton = viewChild.required<string, ElementRef<HTMLButtonElement>>(
    'addButton',
    {
      read: ElementRef,
    },
  );
  protected readonly form = this.draft.form;
  protected readonly involved = this.draft.involved;
  protected readonly max = MAX_INVOLVED;

  protected atLimit(): boolean {
    return this.involved.length >= MAX_INVOLVED;
  }

  protected add(): void {
    if (this.draft.addInvolved()) this.focusAfterRender(this.involved.length - 1);
  }

  /** Ao remover, o foco vai para a linha seguinte, senão para a anterior, senão para "Adicionar envolvido" (FR-022). */
  protected remove(index: number): void {
    this.draft.removeInvolved(index);
    const remaining = this.involved.length;
    this.focusAfterRender(remaining === 0 ? null : Math.min(index, remaining - 1));
  }

  private focusAfterRender(row: number | null): void {
    afterNextRender(
      () => {
        const target =
          row === null
            ? this.addButton().nativeElement
            : this.host.nativeElement.querySelector<HTMLInputElement>(`#involved-name-${row}`);
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  protected next(): void {
    if (this.form.controls.involved.invalid) {
      this.form.controls.involved.markAllAsTouched();
      return;
    }
    void this.router.navigate(['../revisao'], { relativeTo: this.route });
  }
}
