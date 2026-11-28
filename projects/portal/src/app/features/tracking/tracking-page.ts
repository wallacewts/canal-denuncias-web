import {
  type AfterViewInit,
  Component,
  Injectable,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { PageHeader, ScreenState } from '@canal/shared';
import { ReporterAccess } from './reporter-access';
import { TrackingApi } from './tracking.api';
import type { ProvisionalTrackingMessage, ProvisionalTrackingReport } from './tracking.types';
import { TrackingStatus } from './tracking-status';
import { TrackingTimeline } from './tracking-timeline';

export interface TrackingView {
  readonly report: ProvisionalTrackingReport;
  readonly messages: readonly ProvisionalTrackingMessage[];
}

/** Andamento e mensagens com escopo de tela (D35): somem quando a tela é destruída (sair, expirar, 401, trocar de rota). */
@Injectable()
export class TrackingViewState extends ScreenState<TrackingView> {}

/** Acompanhamento da denúncia (PTRK-01, PTRK-02, PTRK-04). Só abre com a credencial em memória (guard). */
@Component({
  selector: 'app-tracking-page',
  imports: [PageHeader, TrackingStatus, TrackingTimeline],
  providers: [TrackingViewState],
  template: `
    <lib-page-header title="Acompanhamento da denúncia" />
    @if (view.value(); as v) {
      <app-tracking-status [report]="v.report" (replyNow)="focusReply()" />
      <app-tracking-timeline [entries]="v.report.timeline" />
    } @else if (loadFailed()) {
      <p>Não foi possível carregar o andamento agora. Tente de novo em alguns minutos.</p>
    } @else {
      <p role="status">Carregando o andamento…</p>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 1.5rem;
    }
  `,
})
export class TrackingPage implements AfterViewInit {
  private readonly api = inject(TrackingApi);
  private readonly access = inject(ReporterAccess);
  protected readonly view = inject(TrackingViewState);
  private readonly header = viewChild.required(PageHeader);
  protected readonly loadFailed = signal(false);

  constructor() {
    this.load();
  }

  ngAfterViewInit(): void {
    this.header().focus();
  }

  protected focusReply(): void {
    document.getElementById('reply-field')?.focus();
  }

  private load(): void {
    const generation = this.access.generation();
    this.api.report().subscribe({
      next: (report) => {
        if (!this.access.isCurrent(generation)) return;
        this.view.set({ report, messages: this.view.value()?.messages ?? [] });
      },
      error: () => {
        if (this.access.isCurrent(generation)) this.loadFailed.set(true);
      },
    });
  }
}
