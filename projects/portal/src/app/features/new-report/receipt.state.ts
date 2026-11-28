import { Injectable, type OnDestroy, computed, signal } from '@angular/core';
import type { ProvisionalReportReceipt } from './report-submission.types';

/**
 * Comprovante do envio (protocolo, chave e data), SÓ em memória e com escopo de tela: fornecido pelo
 * `NewReportFlow` e descartado ao sair do fluxo, ao concluir a tela do protocolo ou por inatividade (PACC-01).
 * Não há caminho de volta: depois de apagado, não pode ser exibido de novo.
 */
@Injectable()
export class ReceiptState implements OnDestroy {
  private readonly receiptState = signal<ProvisionalReportReceipt | null>(null);
  private readonly acknowledgedState = signal(false);

  readonly receipt = this.receiptState.asReadonly();
  readonly acknowledged = this.acknowledgedState.asReadonly();
  readonly hasReceipt = computed(() => this.receiptState() !== null);

  set(receipt: ProvisionalReportReceipt): void {
    this.receiptState.set(receipt);
    this.acknowledgedState.set(false);
  }

  setAcknowledged(value: boolean): void {
    this.acknowledgedState.set(value);
  }

  clear(): void {
    this.receiptState.set(null);
    this.acknowledgedState.set(false);
  }

  ngOnDestroy(): void {
    this.clear();
  }
}
