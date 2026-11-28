import { type AfterViewInit, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Router } from '@angular/router';
import { PageHeader } from '@canal/shared';
import { downloadTextFile } from '@canal/shared/files';
import { EnrollmentState } from './enrollment-state';
import { SignInFlow } from './sign-in-flow';

/** Nome fixo: não identifica a pessoa (R7). */
export const RECOVERY_FILE_NAME = 'codigos-de-recuperacao.txt';

/**
 * Códigos de recuperação exibidos uma única vez (BAUTH-03). Ficam só no estado de tela do primeiro acesso e somem ao
 * sair. "Continuar" só depois de a pessoa marcar que guardou os códigos.
 */
@Component({
  selector: 'app-recovery-codes-page',
  imports: [FormsModule, MatButtonModule, MatCheckboxModule, PageHeader],
  template: `
    <lib-page-header
      title="Códigos de recuperação"
      subtitle="Use um destes códigos se perder o acesso ao aplicativo autenticador. Cada código vale uma única vez."
    />
    @if (codes(); as list) {
      <p class="warning">
        Guarde os códigos agora, num lugar seguro. Eles não serão mostrados de novo.
      </p>
      <ol class="codes" aria-label="Códigos de recuperação">
        @for (code of list; track code) {
          <li>
            <code data-testid="code">{{ code }}</code>
          </li>
        }
      </ol>
      <div class="actions">
        <button mat-stroked-button type="button" (click)="copy(list)">Copiar</button>
        <button mat-stroked-button type="button" (click)="download(list)">Baixar arquivo</button>
      </div>
      <p role="status" data-testid="copy-status" class="status">{{ copyStatus() }}</p>
      <mat-checkbox [(ngModel)]="saved">Guardei os códigos de recuperação</mat-checkbox>
      <div class="actions">
        <button
          mat-flat-button
          type="button"
          [disabled]="!saved() || leaving()"
          (click)="continue()"
        >
          Continuar
        </button>
      </div>
    } @else {
      <p>
        Os códigos de recuperação já foram exibidos e não podem ser vistos de novo. Se não os
        guardou, peça à administração para refazer o cadastro do aplicativo autenticador.
      </p>
      <div class="actions">
        <button mat-flat-button type="button" [disabled]="leaving()" (click)="continue()">
          Continuar
        </button>
      </div>
    }
  `,
  styles: `
    .warning {
      font-weight: 600;
    }
    .codes {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
      gap: 0.25rem 1.5rem;
      padding-inline-start: 1.5rem;
    }
    .codes code {
      font-size: 1.05em;
      overflow-wrap: anywhere;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-block: 0.75rem;
    }
    .status:empty {
      margin: 0;
    }
  `,
})
export class RecoveryCodesPage implements AfterViewInit {
  private readonly state = inject(EnrollmentState);
  private readonly flow = inject(SignInFlow);
  private readonly router = inject(Router);
  private readonly header = viewChild.required(PageHeader);

  protected readonly codes = computed(() => this.state.value()?.recoveryCodes ?? null);
  protected readonly saved = signal(false);
  protected readonly leaving = signal(false);
  protected readonly copyStatus = signal('');

  ngAfterViewInit(): void {
    this.header().focus();
  }

  protected async copy(list: readonly string[]): Promise<void> {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('sem área de transferência');
      await navigator.clipboard.writeText(list.join('\n'));
      this.copyStatus.set('Códigos copiados.');
    } catch {
      this.copyStatus.set(
        'Não foi possível copiar. Selecione os códigos e copie manualmente, ou baixe o arquivo.',
      );
    }
  }

  protected download(list: readonly string[]): void {
    downloadTextFile(
      RECOVERY_FILE_NAME,
      [
        'Canal de Denúncias - códigos de recuperação do backoffice',
        '',
        ...list,
        '',
        'Cada código vale uma única vez. Guarde este arquivo em local seguro.',
        '',
      ].join('\n'),
    );
  }

  protected async continue(): Promise<void> {
    this.leaving.set(true);
    try {
      await this.flow.finish();
    } catch {
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }
}
