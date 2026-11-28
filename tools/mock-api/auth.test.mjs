// Testes das rotas de autenticação simuladas (feature 004, contracts/auth-api.md). Uso: npm run test:scripts
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import {
  ACCOUNTS,
  DEFAULT_PASSWORD,
  PROVISIONAL_PASSWORD,
  VALID_TOTP,
  isCrossOriginWrite,
} from './auth.mjs';
import { createMockApi } from './server.mjs';

let server;
let base;

before(async () => {
  server = createMockApi();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));
beforeEach(async () => {
  await fetch(`${base}/__mock/reset`, { method: 'POST' });
});

const ADMIN = '/api/admin/v1';
const sidOf = (res) => /sid=([^;]*)/.exec(res.headers.get('set-cookie') ?? '')?.[1] ?? null;

async function call(method, path, { body, sid, headers = {} } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(sid ? { Cookie: `sid=${sid}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { res, status: res.status, body: text ? JSON.parse(text) : null, text, sid: sidOf(res) };
}

const scenario = (body) => call('POST', '/__mock/scenario', { body });
const signIn = (email, password) =>
  call('POST', `${ADMIN}/auth/sign-in`, { body: { email, password } });

async function signedIn(email = ACCOUNTS.pronta) {
  const first = await signIn(email, DEFAULT_PASSWORD);
  const mfa = await call('POST', `${ADMIN}/auth/mfa/challenge`, {
    body: { code: VALID_TOTP },
    sid: first.sid,
  });
  return mfa.sid;
}

test('login: a mesma resposta para e-mail inexistente, senha errada, conta bloqueada e desativada', async () => {
  const cases = [
    await signIn('ninguem.SIMULADA@canal.test', DEFAULT_PASSWORD),
    await signIn(ACCOUNTS.pronta, 'XQZ'),
    await signIn(ACCOUNTS.bloqueada, DEFAULT_PASSWORD),
    await signIn(ACCOUNTS.desativada, DEFAULT_PASSWORD),
  ];
  for (const c of cases) {
    assert.equal(c.status, 401);
    assert.equal(c.sid, null);
    assert.equal(c.body.message, 'Não autenticado.');
    assert.ok(!c.text.includes('XQZ'));
  }
});

test('etapa fora de hora: 403 STEP_NOT_ALLOWED (sessão mantida); sem sessão continua 401', async () => {
  const pending = await signIn(ACCOUNTS.pronta, DEFAULT_PASSWORD);
  const early = await call('POST', `${ADMIN}/auth/mfa/enrollment`, { sid: pending.sid });
  assert.equal(early.status, 403);
  assert.equal(early.body.code, 'STEP_NOT_ALLOWED');
  const sid = await signedIn();
  for (const [method, path, body] of [
    ['POST', `${ADMIN}/auth/mfa/challenge`, { code: VALID_TOTP }],
    ['POST', `${ADMIN}/auth/mfa/enrollment`, undefined],
    ['POST', `${ADMIN}/auth/mfa/enrollment/confirmation`, { code: VALID_TOTP }],
  ]) {
    const r = await call(method, path, { body, sid });
    assert.equal(r.status, 403, path);
    assert.equal(r.body.code, 'STEP_NOT_ALLOWED', path);
  }
  assert.equal((await call('GET', `${ADMIN}/me`, { sid })).status, 200, 'sessão mantida');
  assert.equal((await call('POST', `${ADMIN}/auth/mfa/enrollment`)).status, 401);
  const out = await call('POST', `${ADMIN}/auth/sign-out`);
  assert.equal(out.status, 204);
  assert.equal(out.res.headers.get('set-cookie'), null);
});

test('desafio: excesso de tentativas é 429 (cenário rate-limited)', async () => {
  const first = await signIn(ACCOUNTS.pronta, DEFAULT_PASSWORD);
  await scenario({ challenge: 'rate-limited' });
  const r = await call('POST', `${ADMIN}/auth/mfa/challenge`, {
    body: { code: VALID_TOTP },
    sid: first.sid,
  });
  assert.equal(r.status, 429);
  assert.equal(r.body.code, 'TOO_MANY_ATTEMPTS');
});

test('login: excesso de tentativas é 429 (cenário rate-limited)', async () => {
  await scenario({ signIn: 'rate-limited' });
  assert.equal((await signIn(ACCOUNTS.pronta, DEFAULT_PASSWORD)).status, 429);
});

test('login + desafio: etapa, horários, cookie HttpOnly sem Secure e id novo depois do MFA', async () => {
  const first = await signIn(ACCOUNTS.pronta, DEFAULT_PASSWORD);
  assert.equal(first.status, 200);
  assert.equal(first.body.nextStep, 'MFA_REQUIRED');
  assert.match(first.body.idleExpiresAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(first.body.absoluteExpiresAt, /^\d{4}-\d{2}-\d{2}T/);
  const cookie = first.res.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.doesNotMatch(cookie, /Secure/);
  assert.equal(
    (await call('GET', `${ADMIN}/me`, { sid: first.sid })).status,
    401,
    'sessão pendente não usa /me',
  );
  const mfa = await call('POST', `${ADMIN}/auth/mfa/challenge`, {
    body: { code: VALID_TOTP },
    sid: first.sid,
  });
  assert.equal(mfa.status, 200);
  assert.equal(mfa.body.nextStep, 'DONE');
  assert.notEqual(mfa.sid, first.sid);
  const me = await call('GET', `${ADMIN}/me`, { sid: mfa.sid });
  assert.equal(me.status, 200);
  assert.deepEqual(Object.keys(me.body).sort(), [
    'abilities',
    'absoluteExpiresAt',
    'email',
    'id',
    'idleExpiresAt',
    'mfaEnabledAt',
    'name',
    'passwordChangeRequired',
    'roles',
  ]);
  assert.equal(
    (await call('GET', `${ADMIN}/me`, { sid: first.sid })).status,
    401,
    'id antigo não vale',
  );
});

test('desafio: código inválido 422 MFA_CODE_INVALID (sessão mantida), bloqueio 423, recuperação de uso único', async () => {
  let first = await signIn(ACCOUNTS.pronta, DEFAULT_PASSWORD);
  const wrong = await call('POST', `${ADMIN}/auth/mfa/challenge`, {
    body: { code: '12345' },
    sid: first.sid,
  });
  assert.equal(wrong.status, 422);
  assert.equal(wrong.body.code, 'MFA_CODE_INVALID');
  assert.ok(!wrong.text.includes('12345'));
  await scenario({ challenge: 'locked' });
  assert.equal(
    (
      await call('POST', `${ADMIN}/auth/mfa/challenge`, {
        body: { code: VALID_TOTP },
        sid: first.sid,
      })
    ).status,
    423,
  );
  await scenario({ challenge: 'ok' });
  const rec = await call('POST', `${ADMIN}/auth/mfa/challenge`, {
    body: { recoveryCode: 'SIMULADA-REC-0001' },
    sid: first.sid,
  });
  assert.equal(rec.status, 200);
  first = await signIn(ACCOUNTS.pronta, DEFAULT_PASSWORD);
  const again = await call('POST', `${ADMIN}/auth/mfa/challenge`, {
    body: { recoveryCode: 'SIMULADA-REC-0001' },
    sid: first.sid,
  });
  assert.equal(again.status, 422);
  assert.equal(again.body.code, 'MFA_CODE_INVALID');
  // 401 só para sessão ausente ou expirada.
  assert.equal(
    (await call('POST', `${ADMIN}/auth/mfa/challenge`, { body: { code: VALID_TOTP } })).status,
    401,
  );
});

test('quem já tem autenticador e precisa trocar a senha: segundo fator primeiro, depois a troca', async () => {
  const first = await signIn(ACCOUNTS.trocaComAutenticador, PROVISIONAL_PASSWORD);
  assert.equal(first.body.nextStep, 'MFA_REQUIRED');
  const mfa = await call('POST', `${ADMIN}/auth/mfa/challenge`, {
    body: { code: VALID_TOTP },
    sid: first.sid,
  });
  assert.equal(mfa.status, 200);
  assert.equal(mfa.body.nextStep, 'PASSWORD_CHANGE_REQUIRED');
  // Segundo fator feito: /me responde com passwordChangeRequired; as demais rotas administrativas, 403 com código.
  const me = await call('GET', `${ADMIN}/me`, { sid: mfa.sid });
  assert.equal(me.status, 200);
  assert.equal(me.body.passwordChangeRequired, true);
  const other = await call('GET', `${ADMIN}/reports`, { sid: mfa.sid });
  assert.equal(other.status, 403);
  assert.equal(other.body.code, 'PASSWORD_CHANGE_REQUIRED');
  const pwd = await call('PUT', `${ADMIN}/me/password`, {
    body: { currentPassword: PROVISIONAL_PASSWORD, newPassword: 'nova-senha-bem-longa-SIMULADA' },
    sid: mfa.sid,
  });
  assert.equal(pwd.body.nextStep, 'DONE');
  assert.equal(
    (await call('GET', `${ADMIN}/me`, { sid: pwd.sid })).body.passwordChangeRequired,
    false,
  );
  assert.notEqual((await call('GET', `${ADMIN}/reports`, { sid: pwd.sid })).status, 403);
});

test('sem autenticador (AUTH-03): rotas que exigem segundo fator respondem 401', async () => {
  const first = await signIn(ACCOUNTS.primeiroAcesso, PROVISIONAL_PASSWORD);
  assert.equal((await call('GET', `${ADMIN}/me`, { sid: first.sid })).status, 401);
  assert.notEqual((await call('GET', `${ADMIN}/reports`, { sid: first.sid })).status, 403);
});

test('primeiro acesso: senha, cadastro com QR code PNG, 10 códigos e acesso liberado', async () => {
  const first = await signIn(ACCOUNTS.primeiroAcesso, PROVISIONAL_PASSWORD);
  assert.equal(first.body.nextStep, 'PASSWORD_CHANGE_REQUIRED');
  const pwd = await call('PUT', `${ADMIN}/me/password`, {
    body: { currentPassword: PROVISIONAL_PASSWORD, newPassword: 'nova-senha-bem-longa-SIMULADA' },
    sid: first.sid,
  });
  assert.equal(pwd.status, 200);
  assert.equal(pwd.body.nextStep, 'MFA_ENROLLMENT_REQUIRED');
  const enroll = await call('POST', `${ADMIN}/auth/mfa/enrollment`, { sid: pwd.sid });
  assert.equal(enroll.status, 200);
  assert.match(enroll.body.qrCodeDataUri, /^data:image\/png;base64,/);
  assert.match(enroll.body.secret, /__mock/);
  const wrong = await call('POST', `${ADMIN}/auth/mfa/enrollment/confirmation`, {
    body: { code: '000000' },
    sid: pwd.sid,
  });
  assert.equal(wrong.status, 422);
  assert.equal(wrong.body.code, 'MFA_CODE_INVALID');
  const ok = await call('POST', `${ADMIN}/auth/mfa/enrollment/confirmation`, {
    body: { code: VALID_TOTP },
    sid: pwd.sid,
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.recoveryCodes.length, 10);
  assert.equal(ok.body.nextStep, 'DONE');
  assert.equal((await call('GET', `${ADMIN}/me`, { sid: ok.sid })).status, 200);
});

test('troca de senha: 422 com código (senha atual, curta, comum) e 429 na 5ª senha atual errada, encerrando a sessão', async () => {
  const sid = await signedIn();
  const put = (currentPassword, newPassword) =>
    call('PUT', `${ADMIN}/me/password`, { body: { currentPassword, newPassword }, sid });
  const short = await put(DEFAULT_PASSWORD, 'XQZ');
  assert.equal(short.status, 422);
  assert.equal(short.body.code, 'PASSWORD_TOO_SHORT');
  assert.ok(!short.text.includes('XQZ'));
  assert.equal((await put(DEFAULT_PASSWORD, 'senhasenha123')).body.code, 'PASSWORD_COMMON');
  const same = await put(DEFAULT_PASSWORD, DEFAULT_PASSWORD);
  assert.equal(same.status, 422);
  assert.equal(same.body.code, 'PASSWORD_SAME_AS_CURRENT');
  for (let i = 1; i <= 4; i++) {
    const wrong = await put('XQZ', 'nova-senha-bem-longa');
    assert.equal(wrong.status, 422);
    assert.equal(wrong.body.code, 'CURRENT_PASSWORD_INVALID');
  }
  const exceeded = await put('XQZ', 'nova-senha-bem-longa');
  assert.equal(exceeded.status, 429);
  assert.equal(exceeded.body.code, 'CURRENT_PASSWORD_ATTEMPTS_EXCEEDED');
  assert.equal(
    (await call('GET', `${ADMIN}/me`, { sid })).status,
    401,
    'sessão encerrada depois do 429',
  );
});

test('expiração por inatividade e absoluta seguem o relógio do simulador', async () => {
  const sid = await signedIn();
  await call('POST', '/__mock/clock', { body: { advanceMs: 16 * 60_000 } });
  assert.equal((await call('GET', `${ADMIN}/me`, { sid })).status, 401);
  const sid2 = await signedIn();
  for (let i = 0; i < 40; i++) {
    await call('POST', '/__mock/clock', { body: { advanceMs: 14 * 60_000 + 30_000 } });
    const me = await call('GET', `${ADMIN}/me`, { sid: sid2 });
    if (me.status === 401) {
      assert.ok(i >= 33, 'expira só depois de 8 horas');
      return;
    }
  }
  assert.fail('não expirou em 8 horas');
});

test('o cabeçalho Date das rotas de autenticação acompanha o relógio simulado', async () => {
  const sid = await signedIn();
  await call('POST', '/__mock/clock', { body: { advanceMs: 10 * 60_000 } });
  const me = await call('GET', `${ADMIN}/me`, { sid });
  const date = Date.parse(me.res.headers.get('date'));
  assert.ok(Math.abs(date - (Date.now() + 10 * 60_000)) < 5_000);
  const window = Date.parse(me.body.idleExpiresAt) - date;
  assert.ok(
    window > 14 * 60_000 && window <= 15 * 60_000 + 1_000,
    'janela de 15 min no relógio da API',
  );
});

test('sair encerra a sessão e apaga o cookie; revogação em massa para testes de 401', async () => {
  const sid = await signedIn();
  const out = await call('POST', `${ADMIN}/auth/sign-out`, { sid });
  assert.equal(out.status, 204);
  assert.match(out.res.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await call('GET', `${ADMIN}/me`, { sid })).status, 401);
  const sid2 = await signedIn();
  await call('POST', '/__mock/auth/revoke');
  assert.equal((await call('GET', `${ADMIN}/me`, { sid: sid2 })).status, 401);
});

test('proteção por origem: escrita de outra origem é 403, mesma origem passa', async () => {
  const cross = await call('POST', `${ADMIN}/auth/sign-out`, {
    headers: { 'Sec-Fetch-Site': 'cross-site' },
  });
  assert.equal(cross.status, 403);
  const site = await call('POST', `${ADMIN}/auth/sign-out`, {
    headers: { 'Sec-Fetch-Site': 'same-site' },
  });
  assert.equal(site.status, 403);
  const same = await call('POST', `${ADMIN}/auth/sign-out`, {
    headers: { 'Sec-Fetch-Site': 'same-origin' },
  });
  assert.equal(same.status, 204, 'passa pela proteção; sem sessão, sair responde 204 como a API');
  const read = await call('GET', `${ADMIN}/me`, { headers: { 'Sec-Fetch-Site': 'cross-site' } });
  assert.equal(read.status, 401, 'leitura não é barrada pela origem');
  const stats = await call('GET', '/__mock/auth/stats');
  assert.equal(stats.body.crossOriginRejections, 2);
});

test('isCrossOriginWrite segue o algoritmo do Nest sem Sec-Fetch-Site', () => {
  const req = (headers, method = 'POST') => ({ method, headers });
  assert.equal(isCrossOriginWrite(req({})), false, 'sem Origin: cliente fora do navegador');
  assert.equal(
    isCrossOriginWrite(req({ origin: 'http://backoffice:8080', host: 'backoffice:8080' })),
    false,
  );
  assert.equal(
    isCrossOriginWrite(req({ origin: 'https://b.example', host: 'b.example:443' })),
    false,
  );
  assert.equal(
    isCrossOriginWrite(req({ origin: 'http://outro.example', host: 'backoffice:8080' })),
    true,
  );
  assert.equal(
    isCrossOriginWrite(req({ origin: 'http://backoffice:8080', host: 'backoffice' })),
    true,
  );
  assert.equal(isCrossOriginWrite(req({ origin: 'http://x' }, 'GET')), false);
});

test('nenhuma senha aparece nas respostas de erro', async () => {
  const bad = await signIn(ACCOUNTS.pronta, 'XQZ-senha-enviada');
  assert.ok(!bad.text.includes('XQZ-senha-enviada'));
});
