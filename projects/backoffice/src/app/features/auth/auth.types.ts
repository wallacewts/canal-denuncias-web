/**
 * PROVISÓRIO (research.md R10, Complexity Tracking do plano): tipos escritos à mão porque AUTH-01 a AUTH-05 e USERS-07
 * ainda não existem no contrato da API. A integração (tarefa bloqueada) troca tudo pelo cliente gerado de
 * `openapi/admin.json` e apaga este arquivo. Toda resposta é validada em tempo de execução, com as chaves exatas do
 * contrato (specs/004-backoffice-sign-in/contracts/auth-api.md): uma resposta inesperada vira erro, nunca dado na tela.
 * Nenhum token aparece aqui: a sessão é só o cookie HttpOnly da API (D53).
 */

export type NextStep =
  'MFA_REQUIRED' | 'MFA_ENROLLMENT_REQUIRED' | 'PASSWORD_CHANGE_REQUIRED' | 'DONE';
export type PendingStep = Exclude<NextStep, 'DONE'>;

const NEXT_STEPS: readonly NextStep[] = [
  'MFA_REQUIRED',
  'MFA_ENROLLMENT_REQUIRED',
  'PASSWORD_CHANGE_REQUIRED',
  'DONE',
];
const ROLES = ['ADMIN', 'COMPLIANCE_MANAGER', 'ANALYST', 'DPO', 'AUDITOR'] as const;
export type Role = (typeof ROLES)[number];

/** Código de permissão `recurso.ação` (USERS-07). */
const ABILITY = /^[a-z][a-z-]*\.[a-z][a-z-]*$/;
const PNG_DATA_URI = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/;

export interface SessionExpiry {
  readonly idleExpiresAt: Date;
  readonly absoluteExpiresAt: Date;
}

/** Resposta do login, do desafio e da troca de senha: próxima etapa e horários de expiração. */
export interface ProvisionalStepResponse extends SessionExpiry {
  readonly nextStep: NextStep;
}

/** Resposta de `GET /api/admin/v1/me` (USERS-07). `roles` só para exibição; menu e rotas usam `abilities`. */
export interface ProvisionalCurrentUser extends SessionExpiry {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly Role[];
  readonly mfaEnabledAt: Date | null;
  readonly passwordChangeRequired: boolean;
  readonly abilities: readonly string[];
}

/** Resposta de `POST /auth/mfa/enrollment` (AUTH-03). Existe só enquanto a tela de cadastro está aberta. */
export interface ProvisionalEnrollment {
  readonly otpauthUri: string;
  readonly qrCodeDataUri: string;
  readonly secret: string;
}

/** Resposta da confirmação do cadastro: os 10 códigos de recuperação, exibidos uma única vez. */
export interface ProvisionalEnrollmentConfirmation extends ProvisionalStepResponse {
  readonly recoveryCodes: readonly string[];
}

export class InvalidAuthResponseError extends Error {
  constructor() {
    super('Resposta da API fora do formato esperado.');
    this.name = 'InvalidAuthResponseError';
  }
}

type Json = Record<string, unknown>;

function exact(body: unknown, keys: readonly string[]): Json {
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    throw new InvalidAuthResponseError();
  const record = body as Json;
  const actual = Object.keys(record);
  if (actual.length !== keys.length || !keys.every((k) => k in record))
    throw new InvalidAuthResponseError();
  return record;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) throw new InvalidAuthResponseError();
  return value;
}

function date(value: unknown): Date {
  const parsed = typeof value === 'string' ? new Date(value) : new Date(Number.NaN);
  if (Number.isNaN(parsed.getTime())) throw new InvalidAuthResponseError();
  return parsed;
}

function expiry(record: Json): SessionExpiry {
  return {
    idleExpiresAt: date(record['idleExpiresAt']),
    absoluteExpiresAt: date(record['absoluteExpiresAt']),
  };
}

function step(value: unknown): NextStep {
  if (!NEXT_STEPS.includes(value as NextStep)) throw new InvalidAuthResponseError();
  return value as NextStep;
}

const EXPIRY_KEYS = ['idleExpiresAt', 'absoluteExpiresAt'] as const;

export function toStepResponse(body: unknown): ProvisionalStepResponse {
  const r = exact(body, ['nextStep', ...EXPIRY_KEYS]);
  return { nextStep: step(r['nextStep']), ...expiry(r) };
}

export function toCurrentUser(body: unknown): ProvisionalCurrentUser {
  const r = exact(body, [
    'id',
    'name',
    'email',
    'roles',
    'mfaEnabledAt',
    'passwordChangeRequired',
    'abilities',
    ...EXPIRY_KEYS,
  ]);
  const roles = r['roles'];
  const abilities = r['abilities'];
  if (!Array.isArray(roles) || !roles.every((role) => ROLES.includes(role as Role))) {
    throw new InvalidAuthResponseError();
  }
  if (
    !Array.isArray(abilities) ||
    !abilities.every((a) => typeof a === 'string' && ABILITY.test(a))
  ) {
    throw new InvalidAuthResponseError();
  }
  if (typeof r['passwordChangeRequired'] !== 'boolean') throw new InvalidAuthResponseError();
  return {
    id: text(r['id']),
    name: text(r['name']),
    email: text(r['email']),
    roles: roles as Role[],
    mfaEnabledAt: r['mfaEnabledAt'] === null ? null : date(r['mfaEnabledAt']),
    passwordChangeRequired: r['passwordChangeRequired'],
    abilities: abilities as string[],
    ...expiry(r),
  };
}

export function toEnrollment(body: unknown): ProvisionalEnrollment {
  const r = exact(body, ['otpauthUri', 'qrCodeDataUri', 'secret']);
  const qr = text(r['qrCodeDataUri']);
  // Só PNG embutido: o sanitizador do Angular recusa SVG embutido, e contorná-lo exigiria bypassSecurityTrust* (R6).
  if (!PNG_DATA_URI.test(qr)) throw new InvalidAuthResponseError();
  return { otpauthUri: text(r['otpauthUri']), qrCodeDataUri: qr, secret: text(r['secret']) };
}

export function toEnrollmentConfirmation(body: unknown): ProvisionalEnrollmentConfirmation {
  const r = exact(body, ['recoveryCodes', 'nextStep', ...EXPIRY_KEYS]);
  const codes = r['recoveryCodes'];
  if (
    !Array.isArray(codes) ||
    codes.length !== 10 ||
    !codes.every((c) => typeof c === 'string' && c)
  ) {
    throw new InvalidAuthResponseError();
  }
  return { recoveryCodes: codes as string[], nextStep: step(r['nextStep']), ...expiry(r) };
}

/**
 * Códigos de erro de campo de uma resposta 422 (formato `ApiError` da API: `message` com `{ code, path }`). Só os
 * códigos: nunca o texto da API nem o que a pessoa enviou.
 */
export function fieldErrorCodes(body: unknown): string[] {
  const message = typeof body === 'object' && body !== null ? (body as Json)['message'] : null;
  if (!Array.isArray(message)) return [];
  return message
    .map((item) => (typeof item === 'object' && item !== null ? (item as Json)['code'] : null))
    .filter((code): code is string => typeof code === 'string');
}
