import { Component, type OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  EmptyState,
  FieldErrorLink,
  FormFieldError,
  LoadingState,
  PageHeader,
} from '@canal/shared';
import { ReportDraftState } from '../report-draft.state';
import { ReportSubmissionApi } from '../report-submission.api';
import type { ProvisionalCategory } from '../report-submission.types';
import { STEP_STYLES } from './step-styles';

type LoadStatus = 'loading' | 'error' | 'ready';

/** Etapa 2 (PNEW-03): categoria, só as ativas e na ordem da API (CAT-01). */
@Component({
  selector: 'app-category-step',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatRadioModule,
    RouterLink,
    PageHeader,
    FormFieldError,
    FieldErrorLink,
    LoadingState,
    EmptyState,
  ],
  template: `
    <lib-page-header title="Categoria" />
    @switch (status()) {
      @case ('loading') {
        <lib-loading-state label="Carregando as categorias…" />
      }
      @case ('error') {
        <p>Não foi possível carregar as categorias. O que você já preencheu continua guardado.</p>
        <div class="actions">
          <a mat-button routerLink="../tipo">Voltar</a>
          <button mat-flat-button type="button" (click)="load()">Tentar de novo</button>
        </div>
      }
      @case ('ready') {
        @if (categories().length === 0) {
          <lib-empty-state
            title="Não é possível enviar uma denúncia agora."
            description="Nenhuma categoria está disponível. Tente de novo mais tarde."
          />
          <div class="actions"><a mat-button routerLink="../tipo">Voltar</a></div>
        } @else {
          <form [formGroup]="group" (ngSubmit)="next()" novalidate>
            <fieldset>
              <legend id="category-legend">Sobre o que é o relato?</legend>
              <mat-radio-group
                class="options"
                formControlName="code"
                aria-labelledby="category-legend"
                [libFieldError]="error"
                (change)="remember($event.value)"
              >
                @for (category of categories(); track category.code) {
                  <mat-radio-button [value]="category.code">
                    {{ category.name }}
                    @if (category.description) {
                      <span class="hint">{{ category.description }}</span>
                    }
                  </mat-radio-button>
                }
              </mat-radio-group>
              <lib-form-field-error
                #error
                [control]="group.controls.code"
                [messages]="{ required: 'Escolha uma categoria para continuar.' }"
              />
            </fieldset>
            <div class="actions">
              <a mat-button routerLink="../tipo">Voltar</a>
              <button mat-flat-button type="submit">Continuar</button>
            </div>
          </form>
        }
      }
    }
  `,
  styles: STEP_STYLES,
})
export class CategoryStep implements OnInit {
  private readonly api = inject(ReportSubmissionApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly draft = inject(ReportDraftState);
  protected readonly group = this.draft.form.controls.category;
  protected readonly status = signal<LoadStatus>('loading');
  protected readonly categories = signal<ProvisionalCategory[]>([]);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.status.set('loading');
    this.api.categories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.status.set('ready');
      },
      error: () => this.status.set('error'),
    });
  }

  protected remember(code: string): void {
    this.draft.categoryName.set(this.categories().find((c) => c.code === code)?.name ?? null);
  }

  protected next(): void {
    if (this.group.invalid) {
      this.group.markAllAsTouched();
      return;
    }
    void this.router.navigate(['../relato'], { relativeTo: this.route });
  }
}
