import { Injectable } from '@angular/core';
import { ScreenState } from '@canal/shared';
import type { ProvisionalTrackingMessage, ProvisionalTrackingReport } from './tracking.types';

export interface TrackingView {
  readonly report: ProvisionalTrackingReport;
  readonly messages: readonly ProvisionalTrackingMessage[];
}

/** Andamento e mensagens com escopo de tela (D35): somem quando a tela é destruída (sair, expirar, 401, trocar de rota). */
@Injectable()
export class TrackingViewState extends ScreenState<TrackingView> {}
