import {
  Component,
  ElementRef,
  HostListener,
  Injector,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ConfirmDialog, NotificationService } from '@canal/shared';
import { type Observable, filter, of, tap } from 'rxjs';
import { InactivityTimer } from './inactivity-timer';
import { ReceiptState } from './receipt.state';
import { ReportDraftState } from './report-draft.state';
import { WizardProgress } from './wizard-progress';
import { PROTOCOL_PATH, WIZARD_STEPS, firstPendingStep } from './wizard-steps';

/**
 * Rota-pai `/nova-denuncia` (research.md R3). Fornece o rascunho, o comprovante e o temporizador de inatividade com
 * escopo de tela: as etapas, a revisão e a tela do protocolo são filhas, e sair do fluxo destrói este componente e
 * descarta tudo. Nada é salvo no navegador e nada do relato vai na URL.
 */
@Component({
  selector: 'app-new-report-flow',
  imports: [RouterOutlet, WizardProgress],
  providers: [ReportDraftState, ReceiptState, InactivityTimer],
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
  private readonly draft = inject(ReportDraftState);
  private readonly receipt = inject(ReceiptState);
  private readonly timer = inject(InactivityTimer);
  private readonly confirm = inject(ConfirmDialog);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  protected readonly currentPath = signal(this.childPath());

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.onNavigated());
    this.timer.start({
      warn: () => this.warnInactivity(),
      discard: () => this.discardForInactivity(),
    });
    this.onNavigated();
  }

  /** Recarregar ou fechar a aba com rascunho preenchido ou comprovante: aviso do navegador (FR-004). */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: Event): void {
    if (this.draft.hasData() || this.receipt.hasReceipt()) event.preventDefault();
  }

  /** Usado pelo `leaveFlowGuard`: sair com rascunho preenchido pede confirmação e, se confirmado, apaga (FR-005). */
  confirmLeave(): Observable<boolean> {
    if (!this.draft.hasData()) return of(true);
    return this.confirm
      .open({
        title: 'Descartar o rascunho?',
        message: 'O que você preencheu será apagado e não poderá ser recuperado.',
        confirmLabel: 'Descartar',
        cancelLabel: 'Continuar preenchendo',
      })
      .pipe(tap((discard) => discard && this.draft.clear()));
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

  private onNavigated(): void {
    const path = this.childPath();
    // Etapas obrigatórias não podem ser puladas pela URL (FR-003, research.md R5).
    const pending = firstPendingStep((key) => this.draft.isComplete(key as never), path);
    if (pending) {
      void this.router.navigate([pending], { relativeTo: this.route, replaceUrl: true });
      return;
    }
    this.currentPath.set(path);
    this.timer.reset();
    // A cada etapa, o foco vai para o título, para o leitor de tela anunciar onde a pessoa está (FR-007).
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('h1')?.focus(), {
      injector: this.injector,
    });
  }

  private hasSomethingToDiscard(): boolean {
    return this.draft.hasData() || this.receipt.hasReceipt();
  }

  private warnInactivity(): void {
    if (!this.hasSomethingToDiscard()) {
      this.timer.reset();
      return;
    }
    this.confirm
      .open({
        title: 'Você ainda está aí?',
        message:
          'Você está sem atividade há 25 minutos. Por segurança, o que está na tela será apagado em 5 minutos.',
        confirmLabel: 'Continuar',
        cancelLabel: 'Apagar agora',
      })
      .subscribe((keep) => (keep ? this.timer.reset() : this.discardForInactivity()));
  }

  /** Aos 30 minutos sem atividade: apaga rascunho e comprovante (FR-009). */
  private discardForInactivity(): void {
    if (!this.hasSomethingToDiscard()) {
      this.timer.reset();
      return;
    }
    this.dialog.closeAll();
    const onProtocol = this.currentPath() === PROTOCOL_PATH;
    this.draft.clear();
    this.receipt.clear();
    this.timer.reset();
    if (onProtocol) return; // a tela passa a mostrar só o aviso de que protocolo e chave não podem mais ser exibidos
    this.notifications.success('O rascunho foi apagado depois de 30 minutos sem atividade.');
    void this.router.navigate(['tipo'], { relativeTo: this.route });
  }
}
