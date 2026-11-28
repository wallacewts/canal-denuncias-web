import { HttpClient, HttpContext, type HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AdminApiConfiguration,
  authControllerChallenge,
  authControllerConfirmEnrollment,
  authControllerEnroll,
  authControllerSignIn,
  authControllerSignOut,
  meControllerMe,
  meSecurityControllerChangePassword,
} from '@canal/shared/api/admin';
import { API_CALLER_HANDLES } from '@canal/shared/http';
import { map, type Observable } from 'rxjs';
import {
  type CurrentUser,
  type Enrollment,
  type EnrollmentConfirmation,
  type StepResponse,
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

const handles = (...statuses: number[]) => new HttpContext().set(API_CALLER_HANDLES, statuses);

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
 * Chamadas de autenticação do backoffice pelo cliente gerado de `openapi/admin.json` (AUTH-01 a AUTH-05, USERS-07).
 * A sessão é o cookie HttpOnly da API (`__Host-sid`), enviado pela política do backoffice; nenhuma resposta traz token.
 * Cada resposta passa pela validação de `auth.types.ts` antes de chegar à tela.
 */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly root = inject(AdminApiConfiguration).rootUrl;

  /** 401 e 429 recebem a mesma mensagem genérica na tela (etapa da senha sem mensagem própria de bloqueio). */
  signIn(email: string, password: string): Observable<Timed<StepResponse>> {
    return authControllerSignIn(
      this.http,
      this.root,
      { body: { email, password } },
      handles(401, 429),
    ).pipe(timed(toStepResponse));
  }

  /**
   * 422 `MFA_CODE_INVALID` (código errado, erro no campo) e 423 (bloqueio temporário) são tratados pela tela. O 429
   * (`TOO_MANY_ATTEMPTS`) fica com a mensagem genérica da base de erros; o 401 (só sessão ausente ou expirada) segue
   * para a política de sessão encerrada.
   */
  challenge(body: { code: string } | { recoveryCode: string }): Observable<Timed<StepResponse>> {
    return authControllerChallenge(this.http, this.root, { body }, handles(422, 423)).pipe(
      timed(toStepResponse),
    );
  }

  startEnrollment(): Observable<Enrollment> {
    return authControllerEnroll(this.http, this.root).pipe(map((res) => toEnrollment(res.body)));
  }

  /** 422 `MFA_CODE_INVALID` é tratado pela tela; o 401 (sessão encerrada) segue para a política. */
  confirmEnrollment(code: string): Observable<Timed<EnrollmentConfirmation>> {
    return authControllerConfirmEnrollment(
      this.http,
      this.root,
      { body: { code } },
      handles(422),
    ).pipe(timed(toEnrollmentConfirmation));
  }

  /**
   * 422 (senha atual errada ou senha nova fora da política) e 429 (`CURRENT_PASSWORD_ATTEMPTS_EXCEEDED`: 5ª senha atual
   * errada, sessão encerrada pela API).
   */
  changePassword(currentPassword: string, newPassword: string): Observable<Timed<StepResponse>> {
    return meSecurityControllerChangePassword(
      this.http,
      this.root,
      { body: { currentPassword, newPassword } },
      handles(422, 429),
    ).pipe(timed(toStepResponse));
  }

  signOut(): Observable<unknown> {
    return authControllerSignOut(this.http, this.root, undefined, handles(...SIGN_OUT_HANDLED));
  }

  /**
   * Usuário atual. `quiet401`: a restauração ao recarregar trata o 401 sozinha (quem nunca entrou não deve ver
   * "sessão encerrada"); o "Continuar" do aviso deixa o 401 seguir para o encerramento normal.
   */
  me(quiet401 = false): Observable<Timed<CurrentUser>> {
    return meControllerMe(
      this.http,
      this.root,
      undefined,
      quiet401 ? handles(401) : undefined,
    ).pipe(timed(toCurrentUser));
  }
}
