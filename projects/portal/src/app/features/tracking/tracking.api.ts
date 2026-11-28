import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
// Entrada secundária: importar o token pelo barril colocaria a lib inteira no bundle inicial (ver src/http.ts).
import { API_CALLER_HANDLES } from '@canal/shared/http';
import { map, type Observable } from 'rxjs';
import {
  type ProvisionalAccessGrant,
  type ProvisionalAccessRequest,
  type ProvisionalTrackingMessage,
  type ProvisionalTrackingReport,
  toAccessGrant,
  toTrackingMessage,
  toTrackingMessages,
  toTrackingReport,
} from './tracking.types';

/**
 * Chamadas do acompanhamento. PROVISÓRIO: tipos escritos à mão até PUB-01, PUB-03, MSG-01 e MSG-02 saírem no contrato
 * da API; a T037 troca pelas funções do cliente gerado. A credencial vai como Bearer só nas rotas `/me/*`, pela
 * política do portal (D39), que também impede o envio de cookies.
 */
@Injectable({ providedIn: 'root' })
export class TrackingApi {
  private readonly http = inject(HttpClient);

  /** 400, 401 e 429 são tratados pela tela com a mesma mensagem genérica (PACC-02). */
  openAccess(body: ProvisionalAccessRequest): Observable<ProvisionalAccessGrant> {
    return this.http
      .post<unknown>('api:/public/v1/tracking/sessions', body, {
        context: new HttpContext().set(API_CALLER_HANDLES, [400, 401, 429]),
      })
      .pipe(map(toAccessGrant));
  }

  report(): Observable<ProvisionalTrackingReport> {
    return this.http.get<unknown>('api:/public/v1/me/report').pipe(map(toTrackingReport));
  }

  messages(): Observable<ProvisionalTrackingMessage[]> {
    return this.http.get<unknown>('api:/public/v1/me/messages').pipe(map(toTrackingMessages));
  }

  /** 409 (denúncia encerrada) é tratado pela tela, que passa a mostrar as mensagens sem o campo de resposta. */
  send(body: string): Observable<ProvisionalTrackingMessage> {
    return this.http
      .post<unknown>(
        'api:/public/v1/me/messages',
        { body },
        { context: new HttpContext().set(API_CALLER_HANDLES, [409]) },
      )
      .pipe(map(toTrackingMessage));
  }
}
