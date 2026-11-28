import { type AfterViewInit, Component, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
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
  imports: [
    MatButtonModule,
    PageHeader,
    ExpiryBanner,
    TrackingStatus,
    TrackingTimeline,
    TrackingMessages,
  ],
  providers: [TrackingViewState],
  template: `
    <div class="top">
      <lib-page-header title="Acompanhamento da denúncia" />
      <button mat-stroked-button type="button" (click)="exit()">Sair</button>
    </div>
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
    <section aria-labelledby="tracking-guidance-title" class="guidance">
      <h2 id="tracking-guidance-title">Ao terminar</h2>
      <p>
        Clique em Sair e feche a aba. Não salve a chave no navegador. Se estiver num computador de
        outra pessoa, nada da denúncia fica guardado nele.
      </p>
      <button mat-stroked-button type="button" (click)="exit()">Sair</button>
    </section>
  `,
  styles: `
    :host {
      display: grid;
      gap: 1.5rem;
    }
    .top {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .guidance h2 {
      font: var(--mat-sys-title-medium);
      margin: 0 0 0.5rem;
    }
    .guidance p {
      max-width: 65ch;
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

  /** Sair (PTRK-04): o ReporterAccess apaga a credencial e volta para a consulta; a tela e o estado são destruídos. */
  protected exit(): void {
    this.access.end('logout');
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
