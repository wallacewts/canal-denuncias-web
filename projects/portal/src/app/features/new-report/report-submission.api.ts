import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import {
  type ProvisionalCategory,
  type ProvisionalReportReceipt,
  type ProvisionalReportSubmission,
  toCategories,
  toReceipt,
} from './report-submission.types';

/**
 * Chamadas do envio de denúncia. PROVISÓRIO: usa os tipos escritos à mão até CAT-01 e REP-02 saírem no contrato da
 * API; a T048 troca pelas funções do cliente gerado. As chamadas passam pelos interceptors da lib (portal sem cookies,
 * erros padronizados).
 */
@Injectable({ providedIn: 'root' })
export class ReportSubmissionApi {
  private readonly http = inject(HttpClient);

  categories(): Observable<ProvisionalCategory[]> {
    return this.http.get<unknown>('api:/public/v1/categories').pipe(map(toCategories));
  }

  submit(body: ProvisionalReportSubmission): Observable<ProvisionalReportReceipt> {
    return this.http.post<unknown>('api:/public/v1/reports', body).pipe(map(toReceipt));
  }
}
