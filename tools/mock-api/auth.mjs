// Rotas de autenticação do backoffice simuladas (AUTH-01 a AUTH-05, USERS-07), conforme
// specs/004-backoffice-sign-in/contracts/auth-api.md. Só para desenvolvimento e e2e: o build dos apps nunca importa
// este arquivo, e as sentinelas (SIMULADA, __mock) fazem o check:build reprovar qualquer vazamento.
import { randomBytes, randomUUID } from 'node:crypto';

const IDLE_MS = 15 * 60_000;
const ABSOLUTE_MS = 8 * 60 * 60_000;
const MAX_CURRENT_PASSWORD_ERRORS = 5;
const COOKIE = 'sid';
const ADMIN = '/api/admin/v1';

/** Código TOTP aceito pelo simulador (o aplicativo autenticador da pessoa de teste "mostra" este número). */
export const VALID_TOTP = '123456';
export const DEFAULT_PASSWORD = 'senha-correta-SIMULADA';
export const PROVISIONAL_PASSWORD = 'provisoria-SIMULADA';
const COMMON_PASSWORDS = new Set(['senhasenha123', '123456789012', 'canaldedenuncias']);

/** PNG de 1 pixel: o simulador não gera QR code de verdade, só o formato que a API promete (data URI PNG). */
const QR_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const MOCK_SECRET = 'SIMULADA__mockK7Q2M9XR4TPAW3ZN';

const ALL_ABILITIES = [
  'dashboard.read',
  'reports.list',
  'reports.read',
  'reports.triage',
  'users.manage',
  'settings.sla',
  'audit.read',
];

const account = (email, overrides) => ({
  id: randomUUID(),
  email,
  name: 'Pessoa SIMULADA',
  password: DEFAULT_PASSWORD,
  status: 'ACTIVE',
  roles: ['COMPLIANCE_MANAGER'],
  abilities: ALL_ABILITIES,
  mfaEnabledAt: '2026-01-10T12:00:00.000Z',
  passwordChangeRequired: false,
  recoveryCodes: ['SIMULADA-REC-0001', 'SIMULADA-REC-0002'],
  ...overrides,
});

/** Contas de cenário (contracts/auth-api.md). E-mail e nome levam a sentinela SIMULADA. */
export const ACCOUNTS = {
  pronta: 'pronta.SIMULADA@canal.test',
  primeiroAcesso: 'primeiro-acesso.SIMULADA@canal.test',
  bloqueada: 'bloqueada.SIMULADA@canal.test',
  desativada: 'desativada.SIMULADA@canal.test',
  semPermissoes: 'sem-permissoes.SIMULADA@canal.test',
};

const newAccounts = () =>
  new Map(
    [
      account(ACCOUNTS.pronta, { name: 'Pessoa Pronta SIMULADA' }),
      account(ACCOUNTS.primeiroAcesso, {
        name: 'Pessoa Nova SIMULADA',
        password: PROVISIONAL_PASSWORD,
        roles: ['ANALYST'],
        abilities: ['dashboard.read', 'reports.list', 'reports.read'],
        mfaEnabledAt: null,
        passwordChangeRequired: true,
        recoveryCodes: [],
      }),
      account(ACCOUNTS.bloqueada, { status: 'BLOCKED' }),
      account(ACCOUNTS.desativada, { status: 'DISABLED' }),
      account(ACCOUNTS.semPermissoes, {
        name: 'Pessoa Sem Acesso SIMULADA',
        roles: ['AUDITOR'],
        abilities: [],
      }),
    ].map((a) => [a.email.toLowerCase(), a]),
  );

/** Estado de autenticação de uma sessão de teste do simulador. */
export const newAuthState = () => ({
  accounts: newAccounts(),
  sessions: new Map(), // sid → { email, mfa, createdAt, lastActiveAt, currentPasswordErrors, enrolling }
  clockOffsetMs: 0,
  crossOriginRejections: 0,
});

const now = (auth) => Date.now() + auth.clockOffsetMs;

function cookieOf(req) {
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE) return rest.join('=');
  }
  return null;
}

/** Cookie de desenvolvimento do pacote (secure: false → nome `sid`): HttpOnly, SameSite=Strict, sem Secure (R8). */
const setCookie = (sid) => `${COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Strict`;
const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;

const expiry = (auth, s) => ({
  idleExpiresAt: new Date(
    Math.min(s.lastActiveAt + IDLE_MS, s.createdAt + ABSOLUTE_MS),
  ).toISOString(),
  absoluteExpiresAt: new Date(s.createdAt + ABSOLUTE_MS).toISOString(),
});

const alive = (auth, s) =>
  now(auth) < s.lastActiveAt + IDLE_MS && now(auth) < s.createdAt + ABSOLUTE_MS;

function stepOf(acc, s) {
  if (s.mfa === 'verified') return 'DONE';
  if (acc.passwordChangeRequired) return 'PASSWORD_CHANGE_REQUIRED';
  if (!acc.mfaEnabledAt) return 'MFA_ENROLLMENT_REQUIRED';
  return 'MFA_REQUIRED';
}

/** Sessão válida da requisição, ou null (cookie ausente, desconhecido ou expirado). */
function currentSession(req, auth) {
  const sid = cookieOf(req);
  const s = sid ? auth.sessions.get(sid) : null;
  if (!s) return null;
  if (!alive(auth, s)) {
    auth.sessions.delete(sid);
    return null;
  }
  return { sid, s, acc: auth.accounts.get(s.email.toLowerCase()) };
}

function openSession(auth, email, base = {}) {
  const sid = randomBytes(24).toString('base64url');
  const t = now(auth);
  const s = {
    email,
    mfa: 'pending',
    createdAt: t,
    lastActiveAt: t,
    currentPasswordErrors: 0,
    enrolling: false,
    ...base,
  };
  auth.sessions.set(sid, s);
  return { sid, s };
}

/** Troca o id da sessão (login, MFA, troca de senha), como a API (AUTH-02). */
function rotate(auth, sid, s) {
  auth.sessions.delete(sid);
  const next = randomBytes(24).toString('base64url');
  auth.sessions.set(next, s);
  return next;
}

/**
 * Proteção nativa do Nest 12 contra escrita de outra origem (`evaluateCrossOriginRequest`, AUTH-07): métodos seguros
 * passam; com `Sec-Fetch-Site`, só `same-origin` e `none`; sem ele, `Origin` precisa bater com o host.
 */
export function isCrossOriginWrite(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return false;
  const site = req.headers['sec-fetch-site'];
  if (site) return !(site === 'same-origin' || site === 'none');
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const host = String(req.headers.host ?? '').toLowerCase();
    const defaultPort = o.protocol === 'https:' ? '443' : '80';
    const authority = o.port ? `${o.hostname}:${o.port}` : o.hostname;
    return !(
      host === authority.toLowerCase() || host === `${o.hostname}:${defaultPort}`.toLowerCase()
    );
  } catch {
    return true;
  }
}

const readJson = async (req, readBody) => {
  try {
    const raw = await readBody(req);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return null;
  }
};

/** Só as chaves esperadas, todas texto: qualquer coisa a mais vira 400, sem repetir o corpo. */
const strict = (body, keys) =>
  body &&
  typeof body === 'object' &&
  Object.keys(body).every((k) => keys.includes(k)) &&
  Object.values(body).every((v) => typeof v === 'string');

const fieldError = (code, path, message) => ({
  statusCode: 422,
  error: 'Unprocessable Entity',
  message: [{ code, path, message }],
  requestId: randomUUID(),
});

const currentUser = (auth, acc, s) => ({
  id: acc.id,
  name: acc.name,
  email: acc.email,
  roles: acc.roles,
  mfaEnabledAt: acc.mfaEnabledAt,
  passwordChangeRequired: acc.passwordChangeRequired,
  abilities: acc.abilities,
  ...expiry(auth, s),
});

/**
 * Trata as rotas de autenticação e de controle do relógio. Devolve false se a rota não for dela.
 * `helpers`: { json, apiError, readBody, scenario, mockPath }.
 */
export async function handleAuth(req, res, url, auth, helpers) {
  const { json, apiError, readBody, scenario } = helpers;
  const path = url.pathname;
  const noStore = { 'Cache-Control': 'no-store' };

  // Controle (só o e2e chama, direto na rede do e2e).
  if (path === '/__mock/clock' && req.method === 'POST') {
    const body = await readJson(req, readBody);
    auth.clockOffsetMs += Number(body?.advanceMs ?? 0);
    return (json(res, 200, { clockOffsetMs: auth.clockOffsetMs }), true);
  }
  if (path === '/__mock/auth/revoke' && req.method === 'POST') {
    auth.sessions.clear();
    return (res.writeHead(204), res.end(), true);
  }
  if (path === '/__mock/auth/stats' && req.method === 'GET') {
    return (
      json(res, 200, {
        sessions: auth.sessions.size,
        crossOriginRejections: auth.crossOriginRejections,
      }),
      true
    );
  }

  const authRoutes = new Set([
    `${ADMIN}/auth/sign-in`,
    `${ADMIN}/auth/mfa/challenge`,
    `${ADMIN}/auth/mfa/enrollment`,
    `${ADMIN}/auth/mfa/enrollment/confirmation`,
    `${ADMIN}/auth/sign-out`,
    `${ADMIN}/me`,
    `${ADMIN}/me/password`,
  ]);
  if (!authRoutes.has(path)) return false;
  // O front corrige a diferença de relógio pelo cabeçalho Date (R3): ele acompanha o relógio simulado, como na API real
  // o Date acompanha os horários de expiração.
  res.setHeader('Date', new Date(now(auth)).toUTCString());

  if (isCrossOriginWrite(req)) {
    auth.crossOriginRejections += 1;
    return (json(res, 403, apiError(403, 'Forbidden', 'Origem não permitida.')), true);
  }

  const unauthorized = () =>
    json(res, 401, apiError(401, 'Unauthorized', 'Não autenticado.'), noStore);

  if (path === `${ADMIN}/auth/sign-in` && req.method === 'POST') {
    if (scenario.signIn === 'rate-limited') {
      return (json(res, 429, apiError(429, 'Too Many Requests', 'Muitas tentativas.')), true);
    }
    const body = await readJson(req, readBody);
    if (!strict(body, ['email', 'password'])) return (unauthorized(), true);
    const acc = auth.accounts.get(String(body.email).toLowerCase());
    // Mesma resposta para e-mail inexistente, senha errada, conta bloqueada ou desativada (AUTH-01).
    if (!acc || acc.password !== body.password || acc.status !== 'ACTIVE')
      return (unauthorized(), true);
    const old = cookieOf(req);
    if (old) auth.sessions.delete(old);
    const { sid, s } = openSession(auth, acc.email);
    return (
      json(
        res,
        200,
        { nextStep: stepOf(acc, s), ...expiry(auth, s) },
        { ...noStore, 'Set-Cookie': setCookie(sid) },
      ),
      true
    );
  }

  const cur = currentSession(req, auth);

  if (path === `${ADMIN}/auth/sign-out` && req.method === 'POST') {
    if (!cur) return (unauthorized(), true);
    auth.sessions.delete(cur.sid);
    res.writeHead(204, { 'Set-Cookie': clearCookie() });
    res.end();
    return true;
  }

  if (!cur) return (unauthorized(), true);
  const { sid, s, acc } = cur;

  if (path === `${ADMIN}/auth/mfa/challenge` && req.method === 'POST') {
    if (stepOf(acc, s) !== 'MFA_REQUIRED') return (unauthorized(), true);
    if (scenario.challenge === 'locked') {
      return (json(res, 423, apiError(423, 'Locked', 'Bloqueado temporariamente.'), noStore), true);
    }
    const body = await readJson(req, readBody);
    const ok =
      (strict(body, ['code']) && body.code === VALID_TOTP && scenario.challenge !== 'invalid') ||
      (strict(body, ['recoveryCode']) && acc.recoveryCodes.includes(body.recoveryCode));
    if (!ok) return (unauthorized(), true);
    if (body.recoveryCode)
      acc.recoveryCodes = acc.recoveryCodes.filter((c) => c !== body.recoveryCode);
    s.mfa = 'verified';
    s.lastActiveAt = now(auth);
    const next = rotate(auth, sid, s);
    return (
      json(
        res,
        200,
        { nextStep: 'DONE', ...expiry(auth, s) },
        { ...noStore, 'Set-Cookie': setCookie(next) },
      ),
      true
    );
  }

  if (path === `${ADMIN}/auth/mfa/enrollment` && req.method === 'POST') {
    if (stepOf(acc, s) !== 'MFA_ENROLLMENT_REQUIRED') return (unauthorized(), true);
    s.enrolling = true;
    return (
      json(
        res,
        200,
        {
          otpauthUri: `otpauth://totp/Canal%20de%20Den%C3%BAncias:${encodeURIComponent(acc.email)}?secret=${MOCK_SECRET}&issuer=Canal%20de%20Den%C3%BAncias`,
          qrCodeDataUri: QR_PNG,
          secret: MOCK_SECRET,
        },
        noStore,
      ),
      true
    );
  }

  if (path === `${ADMIN}/auth/mfa/enrollment/confirmation` && req.method === 'POST') {
    if (!s.enrolling || stepOf(acc, s) !== 'MFA_ENROLLMENT_REQUIRED') return (unauthorized(), true);
    const body = await readJson(req, readBody);
    if (!strict(body, ['code']) || body.code !== VALID_TOTP) return (unauthorized(), true);
    acc.mfaEnabledAt = new Date(now(auth)).toISOString();
    acc.recoveryCodes = Array.from(
      { length: 10 },
      (_, i) => `SIMULADA-${String(i + 1).padStart(4, '0')}-REC`,
    );
    s.mfa = 'verified';
    s.enrolling = false;
    s.lastActiveAt = now(auth);
    const next = rotate(auth, sid, s);
    return (
      json(
        res,
        200,
        { recoveryCodes: acc.recoveryCodes, nextStep: 'DONE', ...expiry(auth, s) },
        { ...noStore, 'Set-Cookie': setCookie(next) },
      ),
      true
    );
  }

  if (path === `${ADMIN}/me/password` && req.method === 'PUT') {
    const step = stepOf(acc, s);
    if (step !== 'DONE' && step !== 'PASSWORD_CHANGE_REQUIRED') return (unauthorized(), true);
    const body = await readJson(req, readBody);
    if (!strict(body, ['currentPassword', 'newPassword'])) {
      return (json(res, 400, apiError(400, 'Bad Request', 'Corpo inválido.'), noStore), true);
    }
    if (body.currentPassword !== acc.password) {
      s.currentPasswordErrors += 1;
      if (s.currentPasswordErrors >= MAX_CURRENT_PASSWORD_ERRORS) {
        auth.sessions.delete(sid);
        return (
          json(res, 429, apiError(429, 'Too Many Requests', 'Sessão encerrada.'), {
            ...noStore,
            'Set-Cookie': clearCookie(),
          }),
          true
        );
      }
      return (
        json(
          res,
          422,
          fieldError('CURRENT_PASSWORD_INVALID', 'currentPassword', 'Senha atual inválida.'),
          noStore,
        ),
        true
      );
    }
    if (body.newPassword.length < 12) {
      return (
        json(res, 422, fieldError('PASSWORD_TOO_SHORT', 'newPassword', 'Senha curta.'), noStore),
        true
      );
    }
    if (COMMON_PASSWORDS.has(body.newPassword.toLowerCase())) {
      return (
        json(res, 422, fieldError('PASSWORD_COMMON', 'newPassword', 'Senha comum.'), noStore),
        true
      );
    }
    acc.password = body.newPassword;
    acc.passwordChangeRequired = false;
    for (const [other, os] of auth.sessions)
      if (other !== sid && os.email === acc.email) auth.sessions.delete(other);
    s.lastActiveAt = now(auth);
    const next = rotate(auth, sid, s);
    return (
      json(
        res,
        200,
        { nextStep: stepOf(acc, s), ...expiry(auth, s) },
        { ...noStore, 'Set-Cookie': setCookie(next) },
      ),
      true
    );
  }

  if (path === `${ADMIN}/me` && req.method === 'GET') {
    if (s.mfa !== 'verified') return (unauthorized(), true);
    s.lastActiveAt = now(auth);
    return (json(res, 200, currentUser(auth, acc, s), noStore), true);
  }

  return false;
}
