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

test('desafio: código inválido 401, bloqueio 423, código de recuperação de uso único', async () => {
  let first = await signIn(ACCOUNTS.pronta, DEFAULT_PASSWORD);
  assert.equal(
    (await call('POST', `${ADMIN}/auth/mfa/challenge`, { body: { code: '12345' }, sid: first.sid }))
      .status,
    401,
  );
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
  assert.equal(again.status, 401);
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
  assert.equal(
    (
      await call('POST', `${ADMIN}/auth/mfa/enrollment/confirmation`, {
        body: { code: '000000' },
        sid: pwd.sid,
      })
    ).status,
    401,
  );
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
  assert.equal(short.body.message[0].code, 'PASSWORD_TOO_SHORT');
  assert.ok(!short.text.includes('XQZ'));
  assert.equal(
    (await put(DEFAULT_PASSWORD, 'senhasenha123')).body.message[0].code,
    'PASSWORD_COMMON',
  );
  for (let i = 1; i <= 4; i++) {
    const wrong = await put('XQZ', 'nova-senha-bem-longa');
    assert.equal(wrong.status, 422);
    assert.equal(wrong.body.message[0].code, 'CURRENT_PASSWORD_INVALID');
  }
  assert.equal((await put('XQZ', 'nova-senha-bem-longa')).status, 429);
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
  assert.equal(same.status, 401, 'passa pela proteção e cai na falta de sessão');
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
