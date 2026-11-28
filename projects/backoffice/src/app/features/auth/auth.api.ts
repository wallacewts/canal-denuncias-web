import { HttpClient, HttpContext, type HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_CALLER_HANDLES } from '@canal/shared/http';
import { map, type Observable } from 'rxjs';
import {
  type ProvisionalCurrentUser,
  type ProvisionalEnrollment,
  type ProvisionalEnrollmentConfirmation,
  type ProvisionalStepResponse,
  toCurrentUser,
  toEnrollment,
  toEnrollmentConfirmation,
  toStepResponse,
} from './auth.types';

/** Resposta com o horário do servidor (cabeçalho `Date`), para corrigir o relógio local (research R3). */
export interface Timed<T> {
  readonly value: T;
  readonly serverNow: number | null;
}

const handles = (...statuses: number[]) => ({
  context: new HttpContext().set(API_CALLER_HANDLES, statuses),
});

function timed<T>(parse: (body: unknown) => T) {
  return map((res: HttpResponse<unknown>): Timed<T> => {
    const header = res.headers.get('Date');
    const parsed = header ? Date.parse(header) : Number.NaN;
    return { value: parse(res.body), serverNow: Number.isNaN(parsed) ? null : parsed };
  });
}

/** Erros da saída que a tela trata sozinha: a memória é limpa do mesmo jeito (BAUTH-07). */
const SIGN_OUT_HANDLED = [0, 401, 403, 429, 500, 502, 503, 504];

/**
 * Chamadas de autenticação do backoffice. PROVISÓRIO: tipos escritos à mão até AUTH-01 a AUTH-05 e USERS-07 saírem no
 * contrato; a integração troca pelo cliente gerado `@canal/shared/api/admin`. A sessão é o cookie HttpOnly da API,
 * enviado pela política do backoffice; nenhuma resposta traz token.
 */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  /** 401 e 429 recebem a mesma mensagem genérica na tela (etapa da senha sem mensagem própria de bloqueio). */
  signIn(email: string, password: string): Observable<Timed<ProvisionalStepResponse>> {
    return this.http
      .post<unknown>(
        'api:/admin/v1/auth/sign-in',
        { email, password },
        { observe: 'response', ...handles(401, 429) },
      )
      .pipe(timed(toStepResponse));
  }

  /**
   * 422 `MFA_CODE_INVALID` (código errado, erro no campo) e 423 (bloqueio temporário) são tratados pela tela. O 401 (só
   * sessão ausente ou expirada) segue para a política de sessão encerrada.
   */
  challenge(
    body: { code: string } | { recoveryCode: string },
  ): Observable<Timed<ProvisionalStepResponse>> {
    return this.http
      .post<unknown>('api:/admin/v1/auth/mfa/challenge', body, {
        observe: 'response',
        ...handles(422, 423),
      })
      .pipe(timed(toStepResponse));
  }

  startEnrollment(): Observable<ProvisionalEnrollment> {
    return this.http
      .post<unknown>('api:/admin/v1/auth/mfa/enrollment', null)
      .pipe(map(toEnrollment));
  }

  /** 422 `MFA_CODE_INVALID` é tratado pela tela; o 401 (sessão encerrada) segue para a política. */
  confirmEnrollment(code: string): Observable<Timed<ProvisionalEnrollmentConfirmation>> {
    return this.http
      .post<unknown>(
        'api:/admin/v1/auth/mfa/enrollment/confirmation',
        { code },
        {
          observe: 'response',
          ...handles(422),
        },
      )
      .pipe(timed(toEnrollmentConfirmation));
  }

  /** 422 (senha atual errada ou senha nova fora da política) e 429 (limite de tentativas, sessão encerrada). */
  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Observable<Timed<ProvisionalStepResponse>> {
    return this.http
      .put<unknown>(
        'api:/admin/v1/me/password',
        { currentPassword, newPassword },
        {
          observe: 'response',
          ...handles(422, 429),
        },
      )
      .pipe(timed(toStepResponse));
  }

  signOut(): Observable<unknown> {
    return this.http.post('api:/admin/v1/auth/sign-out', null, handles(...SIGN_OUT_HANDLED));
  }

  /**
   * Usuário atual. `quiet401`: a restauração ao recarregar trata o 401 sozinha (quem nunca entrou não deve ver
   * "sessão encerrada"); o "Continuar" do aviso deixa o 401 seguir para o encerramento normal.
   */
  me(quiet401 = false): Observable<Timed<ProvisionalCurrentUser>> {
    return this.http
      .get<unknown>('api:/admin/v1/me', { observe: 'response', ...(quiet401 ? handles(401) : {}) })
      .pipe(timed(toCurrentUser));
  }
}
