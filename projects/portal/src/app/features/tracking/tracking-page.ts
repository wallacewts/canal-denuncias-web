import { type AfterViewInit, Component, inject, signal, viewChild } from '@angular/core';
import { PageHeader } from '@canal/shared';
import { forkJoin } from 'rxjs';
import { ExpiryBanner } from './expiry-banner';
import { ReporterAccess } from './reporter-access';
import { TrackingApi } from './tracking.api';
import { TrackingViewState } from './tracking-view.state';
import { TrackingStatus } from './tracking-status';
import { TrackingTimeline } from './tracking-timeline';
import { TrackingMessages } from './tracking-messages';

/** Acompanhamento da denúncia (PTRK-01, PTRK-02, PTRK-04). Só abre com a credencial em memória (guard). */
@Component({
  selector: 'app-tracking-page',
  imports: [PageHeader, ExpiryBanner, TrackingStatus, TrackingTimeline, TrackingMessages],
  providers: [TrackingViewState],
  template: `
    <lib-page-header title="Acompanhamento da denúncia" />
    <app-expiry-banner />
    @if (view.value(); as v) {
      <app-tracking-status [report]="v.report" (replyNow)="focusReply()" />
      <app-tracking-timeline [entries]="v.report.timeline" />
      <app-tracking-messages />
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
    forkJoin({ report: this.api.report(), messages: this.api.messages() }).subscribe({
      next: (view) => {
        if (this.access.isCurrent(generation)) this.view.set(view);
      },
      error: () => {
        if (this.access.isCurrent(generation)) this.loadFailed.set(true);
      },
    });
  }
}
