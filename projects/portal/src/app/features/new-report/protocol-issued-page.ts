import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Router, RouterLink } from '@angular/router';
import { ConfirmDialog, PageHeader, PortalDatePipe } from '@canal/shared';
import { type Observable, tap } from 'rxjs';
import { ReceiptState } from './receipt.state';
import { downloadReceipt } from './receipt-file';

type CopyTarget = 'protocol' | 'accessKey';
const COPY_LABELS: Record<CopyTarget, string> = { protocol: 'Protocolo', accessKey: 'Chave' };

/**
 * Tela do protocolo (PACC-01). Mostra protocolo e chave uma única vez, a partir da memória. Recarregar, sair ou
 * concluir apaga os dois. Nada aparece na URL, no título ou no console.
 */
@Component({
  selector: 'app-protocol-issued-page',
  imports: [MatButtonModule, MatCheckboxModule, RouterLink, PageHeader, PortalDatePipe],
  template: `
    <lib-page-header title="Protocolo gerado" />
    @if (receipt.receipt(); as r) {
      <p class="warning">
        <strong>Esta é a única vez que a chave aparece.</strong> Não é possível recuperá-la. Sem
        ela, você não consegue acompanhar a denúncia. Anote, copie ou baixe agora.
      </p>
      <dl>
        <dt>Protocolo</dt>
        <dd>
          <span class="value" data-testid="protocol">{{ r.protocol }}</span>
        </dd>
        <dt>Chave de acompanhamento</dt>
        <dd>
          <span class="value" data-testid="access-key">{{ r.accessKey }}</span>
        </dd>
        <dt>Recebida em</dt>
        <dd>
          <span data-testid="received-on">{{ r.receivedOn | portalDate }}</span>
        </dd>
      </dl>
      <div class="actions">
        <button mat-stroked-button type="button" (click)="copy('protocol')">
          Copiar protocolo
        </button>
        <button mat-stroked-button type="button" (click)="copy('accessKey')">Copiar chave</button>
        <button mat-stroked-button type="button" (click)="download()">
          Baixar comprovante (.txt)
        </button>
      </div>
      <p role="status" class="status">{{ copyStatus() }}</p>
      <mat-checkbox
        [checked]="receipt.acknowledged()"
        (change)="receipt.setAcknowledged($event.checked)"
      >
        Guardei o protocolo e a chave
      </mat-checkbox>
      <div class="actions">
        <button
          mat-flat-button
          type="button"
          [disabled]="!receipt.acknowledged()"
          (click)="finish()"
        >
          Concluir
        </button>
      </div>
    } @else {
      <p>
        O protocolo e a chave não podem mais ser exibidos. Se você enviou uma denúncia, use os dados
        que guardou.
      </p>
      <div class="actions">
        <a mat-button routerLink="/consultar">Consultar uma denúncia</a>
        <a mat-button routerLink="/">Ir para o início</a>
      </div>
    }
  `,
  styles: `
    .warning {
      max-width: 65ch;
    }
    dt {
      font-weight: 600;
    }
    dd {
      margin: 0 0 0.75rem;
    }
    .value {
      font: var(--mat-sys-title-medium);
      font-family: monospace;
      user-select: all;
      overflow-wrap: anywhere;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1rem;
      margin-block: 1rem;
    }
    .status {
      min-height: 1.25rem;
    }
  `,
})
export class ProtocolIssuedPage {
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmDialog);
  protected readonly receipt = inject(ReceiptState);
  protected readonly copyStatus = signal('');

  /** Copia com a área de transferência; se ela não existir ou for negada, orienta a copiar manualmente (R11). */
  protected async copy(target: CopyTarget): Promise<void> {
    const r = this.receipt.receipt();
    if (!r) return;
    const label = COPY_LABELS[target];
    const fallback = `Não foi possível copiar automaticamente: selecione o texto e copie. ${label} continua na tela.`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('sem área de transferência');
      await navigator.clipboard.writeText(r[target]);
      this.copyStatus.set(`${label} copiad${target === 'protocol' ? 'o' : 'a'}.`);
    } catch {
      this.copyStatus.set(fallback);
    }
  }

  protected download(): void {
    const r = this.receipt.receipt();
    if (r) downloadReceipt(r);
  }

  /**
   * Usado pelo `leaveProtocolGuard`. Sem comprovante (já concluído, recarregado ou apagado por inatividade), sai sem
   * perguntar. Com comprovante, pede confirmação e, se a pessoa sair, apaga protocolo e chave.
   */
  canLeave(): boolean | Observable<boolean> {
    if (!this.receipt.hasReceipt()) return true;
    return this.confirm
      .open({
        title: 'Sair sem guardar?',
        message:
          'O protocolo e a chave não poderão ser exibidos de novo. Confira se você os guardou.',
        confirmLabel: 'Sair',
        cancelLabel: 'Ficar',
      })
      .pipe(tap((leave) => leave && this.receipt.clear()));
  }

  protected finish(): void {
    this.receipt.clear();
    void this.router.navigateByUrl('/');
  }
}
