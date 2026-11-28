import { Component, ElementRef, Injector, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ReceiptState } from './receipt.state';
import { ReportDraftState } from './report-draft.state';
import { WizardProgress } from './wizard-progress';
import { PROTOCOL_PATH, WIZARD_STEPS } from './wizard-steps';

/**
 * Rota-pai `/nova-denuncia` (research.md R3). Fornece o rascunho e o comprovante com escopo de tela: as etapas, a
 * revisão e a tela do protocolo são filhas, e sair do fluxo destrói este componente e descarta os dois estados.
 * Nada é salvo no navegador e nada do relato vai na URL.
 */
@Component({
  selector: 'app-new-report-flow',
  imports: [RouterOutlet, WizardProgress],
  providers: [ReportDraftState, ReceiptState],
  template: `
    @if (isWizardStep()) {
      <app-wizard-progress [currentPath]="currentPath()" />
    }
    <router-outlet />
  `,
})
export class NewReportFlow {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly currentPath = signal(this.childPath());

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.onNavigated());
    this.onNavigated();
  }

  protected isWizardStep(): boolean {
    return (
      this.currentPath() !== PROTOCOL_PATH &&
      WIZARD_STEPS.some((s) => s.path === this.currentPath())
    );
  }

  private childPath(): string {
    return this.route.snapshot.firstChild?.routeConfig?.path ?? '';
  }

  /** A cada etapa, o foco vai para o título, para o leitor de tela anunciar onde a pessoa está (FR-007). */
  private onNavigated(): void {
    this.currentPath.set(this.childPath());
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('h1')?.focus(), {
      injector: this.injector,
    });
  }
}
