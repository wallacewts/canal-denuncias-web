import {
  InvalidAuthResponseError,
  errorCodes,
  fieldErrorCodes,
  toCurrentUser,
  toEnrollment,
  toEnrollmentConfirmation,
  toStepResponse,
} from './auth.types';

const EXPIRY = {
  idleExpiresAt: '2026-11-28T12:15:00.000Z',
  absoluteExpiresAt: '2026-11-28T20:00:00.000Z',
};
const USER = {
  id: '0193a7b0-0000-7000-8000-000000000001',
  name: 'Pessoa',
  email: 'p@x.test',
  roles: ['ANALYST'],
  mfaEnabledAt: '2026-01-10T12:00:00.000Z',
  passwordChangeRequired: false,
  abilities: ['reports.list', 'reports.read'],
  ...EXPIRY,
};
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('auth.types (tipos provisórios, R10)', () => {
  it('etapa e horários do login viram datas', () => {
    const r = toStepResponse({ nextStep: 'MFA_REQUIRED', ...EXPIRY });
    expect(r.nextStep).toBe('MFA_REQUIRED');
    expect(r.idleExpiresAt).toEqual(new Date(EXPIRY.idleExpiresAt));
    expect(r.absoluteExpiresAt).toEqual(new Date(EXPIRY.absoluteExpiresAt));
  });

  it('etapa desconhecida, horário inválido ou campo a mais são recusados', () => {
    expect(() => toStepResponse({ nextStep: 'X', ...EXPIRY })).toThrow(InvalidAuthResponseError);
    expect(() => toStepResponse({ nextStep: 'DONE', ...EXPIRY, idleExpiresAt: 'ontem' })).toThrow(
      InvalidAuthResponseError,
    );
    expect(() => toStepResponse({ nextStep: 'DONE', ...EXPIRY, token: 'XQZ' })).toThrow(
      InvalidAuthResponseError,
    );
  });

  it('usuário atual com permissões no formato recurso.ação', () => {
    const u = toCurrentUser(USER);
    expect(u.abilities).toEqual(['reports.list', 'reports.read']);
    expect(u.mfaEnabledAt).toEqual(new Date(USER.mfaEnabledAt));
    expect(() => toCurrentUser({ ...USER, abilities: ['REPORTS'] })).toThrow(
      InvalidAuthResponseError,
    );
    expect(() => toCurrentUser({ ...USER, extra: 1 })).toThrow(InvalidAuthResponseError);
  });

  it('cadastro só aceita QR code PNG embutido (SVG exigiria bypass do sanitizador)', () => {
    const ok = { otpauthUri: 'otpauth://totp/x', qrCodeDataUri: PNG, secret: 'ABCD' };
    expect(toEnrollment(ok).qrCodeDataUri).toBe(PNG);
    expect(() =>
      toEnrollment({ ...ok, qrCodeDataUri: 'data:image/svg+xml;base64,PHN2Zz4=' }),
    ).toThrow(InvalidAuthResponseError);
    expect(() => toEnrollment({ ...ok, qrCodeDataUri: 'https://qr.example/x.png' })).toThrow(
      InvalidAuthResponseError,
    );
  });

  it('confirmação traz exatamente 10 códigos de recuperação', () => {
    const codes = Array.from({ length: 10 }, (_, i) => `C${i}`);
    expect(
      toEnrollmentConfirmation({ recoveryCodes: codes, nextStep: 'DONE', ...EXPIRY }).recoveryCodes,
    ).toEqual(codes);
    expect(() =>
      toEnrollmentConfirmation({ recoveryCodes: codes.slice(1), nextStep: 'DONE', ...EXPIRY }),
    ).toThrow(InvalidAuthResponseError);
  });

  it('códigos de erro do corpo 422 (formato ApiError), sem nenhum valor enviado', () => {
    const body = {
      statusCode: 422,
      error: 'Unprocessable Entity',
      message: [{ code: 'CURRENT_PASSWORD_INVALID', path: 'currentPassword', message: 'x' }],
      requestId: 'r',
    };
    expect(fieldErrorCodes(body)).toEqual(['CURRENT_PASSWORD_INVALID']);
    expect(fieldErrorCodes({ message: 'texto' })).toEqual([]);
    expect(fieldErrorCodes(null)).toEqual([]);
  });

  it('errorCodes lê o código de domínio no topo do corpo (D56) e os de validação em message', () => {
    expect(
      errorCodes({
        statusCode: 422,
        error: 'x',
        message: 'm',
        code: 'PASSWORD_TOO_LONG',
        requestId: 'r',
      }),
    ).toEqual(['PASSWORD_TOO_LONG']);
    expect(
      errorCodes({ message: [{ code: 'MFA_CODE_INVALID', path: 'code', message: 'm' }] }),
    ).toEqual(['MFA_CODE_INVALID']);
    expect(errorCodes({ code: 42 })).toEqual([]);
    expect(errorCodes('texto')).toEqual([]);
  });
});
