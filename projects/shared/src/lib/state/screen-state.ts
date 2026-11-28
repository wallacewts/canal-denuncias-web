import { Injectable, type OnDestroy, signal } from '@angular/core';

/**
 * Padrão de estado sensível com escopo de tela (FTRV-10, research.md R2): um serviço com signals fornecido no
 * componente de rota (`providers: [MeuEstado]`), destruído junto com a tela. Ao sair, o valor é descartado.
 * Nada é guardado no navegador.
 *
 *   @Injectable() class ReportDraftState extends ScreenState<ReportDraft> {}
 *   @Component({ providers: [ReportDraftState], ... }) class NewReportWizard { ... }
 *
 * Critério para adotar @ngrx/signals: tela com mais de uma fonte assíncrona e regras de atualização compartilhadas
 * por vários componentes (provável na caixa de denúncias do backoffice).
 */
@Injectable()
export class ScreenState<T> implements OnDestroy {
  private readonly state = signal<T | null>(null);
  readonly value = this.state.asReadonly();

  set(value: T): void {
    this.state.set(value);
  }

  clear(): void {
    this.state.set(null);
  }

  ngOnDestroy(): void {
    this.clear();
  }
}
