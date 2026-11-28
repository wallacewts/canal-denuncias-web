import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageHeader } from '@canal/shared';
import { PrivacyNoticeDialog } from '../privacy/privacy-notice-dialog';
import { ReceiptState } from './receipt.state';
import { ReportDraftState } from './report-draft.state';
import { ReportSubmissionApi } from './report-submission.api';
import type { DataType, ReporterType } from './report-submission.types';
import { toSubmission } from './to-submission';

const REPORTER_LABELS: Record<ReporterType, string> = {
  EMPLOYEE: 'Colaborador',
  PARTNER: 'Parceiro',
  THIRD_PARTY: 'Terceiro',
};
const DATA_TYPE_LABELS: Record<DataType, string> = {
  PERSONAL: 'Dados pessoais',
  FINANCIAL: 'Dados financeiros',
  CREDENTIALS: 'Credenciais',
  OTHER: 'Outros',
};
const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** Etapa 5 (PNEW-06): revisão e envio. Todo texto é exibido como texto, nunca como HTML. */
@Component({
  selector: 'app-review-page',
  imports: [MatButtonModule, RouterLink, PageHeader],
  template: `
    <lib-page-header
      title="Revisão"
      subtitle="Confira o que será enviado. Você pode editar qualquer etapa."
    />
    @let d = draft.value();
    <section>
      <h2>Tipo de denunciante</h2>
      <p>{{ reporterLabel() }}</p>
      <a routerLink="../tipo">Editar tipo de denunciante</a>
    </section>
    <section>
      <h2>Categoria</h2>
      <p>{{ draft.categoryName() ?? d.category.code }}</p>
      <a routerLink="../categoria">Editar categoria</a>
    </section>
    <section>
      <h2>Relato</h2>
      <dl>
        <dt>Descrição</dt>
        <dd class="pre">{{ d.content.description }}</dd>
        <dt>Quando aconteceu</dt>
        <dd>{{ occurred() }}</dd>
        @for (item of optionalTexts(); track item.label) {
          <dt>{{ item.label }}</dt>
          <dd class="pre">{{ item.value }}</dd>
        }
        @if (dataTypes()) {
          <dt>Tipos de dados</dt>
          <dd>{{ dataTypes() }}</dd>
        }
      </dl>
      <a routerLink="../relato">Editar relato</a>
    </section>
    <section>
      <h2>Envolvidos</h2>
      @if (involved().length) {
        <ul>
          @for (person of involved(); track $index) {
            <li>{{ person }}</li>
          }
        </ul>
      } @else {
        <p>Nenhum envolvido informado.</p>
      }
      <a routerLink="../envolvidos">Editar envolvidos</a>
    </section>

    <p class="privacy">
      Antes de enviar, leia como os seus dados são tratados.
      <button mat-button type="button" (click)="openPrivacy()">Ler o aviso de privacidade</button>
    </p>
    @if (failed()) {
      <p class="error" role="alert">
        Não foi possível enviar. O seu rascunho continua aqui: tente de novo.
      </p>
    }
    <div class="actions">
      <a mat-button routerLink="../envolvidos">Voltar</a>
      <button mat-flat-button type="button" [disabled]="submitting()" (click)="submit()">
        {{ failed() ? 'Tentar de novo' : 'Enviar denúncia' }}
      </button>
    </div>
    <p role="status" class="status">{{ submitting() ? 'Enviando a denúncia…' : '' }}</p>
  `,
  styles: `
    section {
      margin-block-end: 1.5rem;
    }
    h2 {
      font: var(--mat-sys-title-medium);
      margin: 0 0 0.25rem;
    }
    dt {
      font-weight: 600;
    }
    dd {
      margin: 0 0 0.5rem;
    }
    .pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .error {
      color: var(--mat-sys-error);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1rem;
    }
  `,
})
export class ReviewPage {
  private readonly api = inject(ReportSubmissionApi);
  private readonly receipt = inject(ReceiptState);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  protected readonly draft = inject(ReportDraftState);
  protected readonly submitting = signal(false);
  protected readonly failed = signal(false);

  private readonly snapshot = signal(this.draft.value());
  protected readonly reporterLabel = computed(() => {
    const type = this.snapshot().reporterType.type;
    return type ? REPORTER_LABELS[type] : '';
  });
  protected readonly occurred = computed(() => {
    const c = this.snapshot().content;
    if (c.occurredKind === 'date') return c.occurredDate.split('-').reverse().join('/');
    if (c.occurredKind === 'month')
      return `${MONTHS[Number(c.occurredMonth) - 1]} de ${c.occurredYear}`;
    return 'Não informado';
  });
  protected readonly optionalTexts = computed(() => {
    const c = this.snapshot().content;
    return [
      { label: 'Onde aconteceu', value: c.location },
      { label: 'Sistemas afetados', value: c.affectedSystems },
      { label: 'Como você soube', value: c.howKnown },
      { label: 'Evidências', value: c.evidenceNotes },
    ].filter((item) => item.value.trim() !== '');
  });
  protected readonly dataTypes = computed(() =>
    this.snapshot()
      .content.dataTypes.map((t) => DATA_TYPE_LABELS[t])
      .join(', '),
  );
  protected readonly involved = computed(() =>
    this.snapshot()
      .involved.filter((p) => p.name.trim() || p.role.trim())
      .map((p) => [p.name.trim(), p.role.trim()].filter(Boolean).join(' · ')),
  );

  protected openPrivacy(): void {
    this.dialog.open(PrivacyNoticeDialog, { autoFocus: 'dialog', restoreFocus: true });
  }

  /** Envia uma vez só: um segundo clique durante o envio é ignorado (FR-025). */
  protected submit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.failed.set(false);
    this.api.submit(toSubmission(this.draft.value())).subscribe({
      next: (receipt) => {
        this.receipt.set(receipt);
        this.draft.clear();
        void this.router.navigate(['../protocolo'], { relativeTo: this.route });
      },
      error: () => {
        // O rascunho fica intacto; a mensagem do erro vem do errorInterceptor (FTRV-02).
        this.submitting.set(false);
        this.failed.set(true);
      },
    });
  }
}
