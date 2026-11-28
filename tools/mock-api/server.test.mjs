// Testes do servidor simulado da API (feature 002, contracts/mock-api.md). Uso: node --test tools/mock-api/
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
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

const scenario = (body) =>
  fetch(`${base}/__mock/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const submit = (body) =>
  fetch(`${base}/api/public/v1/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const VALID = {
  reporterType: 'EMPLOYEE',
  categoryCode: 'SIMULADA_VAZAMENTO',
  description: 'x'.repeat(100),
};

test('categorias: padrão devolve as ativas na ordem, com código, nome e descrição', async () => {
  const res = await fetch(`${base}/api/public/v1/categories`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.length, 3);
  for (const c of body) {
    assert.match(c.code, /^SIMULADA_/);
    assert.equal(typeof c.name, 'string');
    assert.ok('description' in c);
  }
});

test('categorias: cenário empty devolve lista vazia e error devolve 500 no formato ApiError', async () => {
  await scenario({ categories: 'empty' });
  assert.deepEqual(await (await fetch(`${base}/api/public/v1/categories`)).json(), []);
  await scenario({ categories: 'error' });
  const res = await fetch(`${base}/api/public/v1/categories`);
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['error', 'message', 'requestId', 'statusCode']);
});

test('envio válido: 201 com protocolo, chave e data só com o dia', async () => {
  const res = await submit(VALID);
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.protocol, 'DV-SIMUL-ADO00');
  assert.match(body.accessKey, /^SIMULADA/);
  assert.match(body.receivedOn, /^\d{4}-\d{2}-\d{2}$/);
});

test('envio com todos os campos opcionais dentro dos limites é aceito', async () => {
  const res = await submit({
    ...VALID,
    description: 'x'.repeat(10_000),
    occurredOn: '2026-10',
    location: 'y'.repeat(2_000),
    affectedSystems: 'ERP',
    dataTypes: ['PERSONAL', 'FINANCIAL', 'CREDENTIALS', 'OTHER'],
    involved: Array.from({ length: 20 }, () => ({ name: 'A', role: 'B' })),
    howKnown: 'vi',
    evidenceNotes: 'log',
  });
  assert.equal(res.status, 201);
});

const invalid = [
  ['descrição com 99 caracteres', { ...VALID, description: 'x'.repeat(99) }, 'description'],
  ['descrição com 10.001 caracteres', { ...VALID, description: 'x'.repeat(10_001) }, 'description'],
  ['texto opcional com 2.001 caracteres', { ...VALID, location: 'y'.repeat(2_001) }, 'location'],
  ['21 envolvidos', { ...VALID, involved: Array.from({ length: 21 }, () => ({})) }, 'involved'],
  ['tipo de denunciante desconhecido', { ...VALID, reporterType: 'BOSS' }, 'reporterType'],
  ['tipo de dado desconhecido', { ...VALID, dataTypes: ['HEALTH'] }, 'dataTypes'],
  ['data em formato errado', { ...VALID, occurredOn: '10/2026' }, 'occurredOn'],
  ['campo de identificação', { ...VALID, identity: { name: 'Fulano' } }, 'identity'],
];

for (const [name, body, path] of invalid) {
  test(`envio recusado com 400 (${name}) sem repetir o valor enviado`, async () => {
    const res = await submit(body);
    assert.equal(res.status, 400);
    const text = await res.text();
    const error = JSON.parse(text);
    assert.equal(error.statusCode, 400);
    assert.ok(error.message.some((m) => m.path === path));
    // Nenhum valor recebido volta na resposta (texto curto também).
    for (const value of ['Fulano', 'BOSS', 'HEALTH', '10/2026', 'yyyyyyyyyy', 'xxxxxxxxxx']) {
      assert.ok(!text.includes(value), `a resposta repetiu "${value}"`);
    }
  });
}

test('JSON malformado com texto curto: 400 sem repetir o texto', async () => {
  const res = await fetch(`${base}/api/public/v1/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"description": RELATO',
  });
  assert.equal(res.status, 400);
  assert.ok(!(await res.text()).includes('RELATO'));
});

test('cenários de envio: invalid (400), error (500) e slow (201 depois de esperar)', async () => {
  await scenario({ submit: 'invalid' });
  assert.equal((await submit(VALID)).status, 400);
  await scenario({ submit: 'error' });
  assert.equal((await submit(VALID)).status, 500);
  await scenario({ submit: 'slow' });
  const started = Date.now();
  assert.equal((await submit(VALID)).status, 201);
  assert.ok(Date.now() - started >= 1_500);
});

test('contador de envios e reset', async () => {
  await submit(VALID);
  await submit(VALID);
  assert.equal((await (await fetch(`${base}/__mock/stats`)).json()).submissions, 2);
  await fetch(`${base}/__mock/reset`, { method: 'POST' });
  assert.equal((await (await fetch(`${base}/__mock/stats`)).json()).submissions, 0);
});

test('cenário e contador são isolados por sessão (x-mock-session)', async () => {
  const headers = { 'Content-Type': 'application/json', 'x-mock-session': 'outra' };
  await fetch(`${base}/__mock/scenario`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ categories: 'empty' }),
  });
  const other = await fetch(`${base}/api/public/v1/categories`, { headers });
  assert.deepEqual(await other.json(), []);
  // A sessão padrão não foi afetada.
  assert.equal((await (await fetch(`${base}/api/public/v1/categories`)).json()).length, 3);
});

test('rotas /fixture/* e eco continuam respondendo como na feature 001', async () => {
  assert.equal((await fetch(`${base}/fixture/clean`)).status, 200);
  const echo = await (await fetch(`${base}/api/qualquer`)).json();
  assert.equal(echo.path, '/api/qualquer');
});

// ---------------------------------------------------------------------------------------------------------------
// Acompanhamento (feature 003, specs/003-report-tracking/contracts/mock-api-tracking.md)
// ---------------------------------------------------------------------------------------------------------------

const SESSION = { 'x-mock-session': 'teste-acompanhamento' };
const OTHER = { 'x-mock-session': 'outra-sessao' };
const PROTOCOL = 'DV-SIMUL-ADO00';
const KEY = 'SIMULADA-K7Q2-M9XR-4TPA-W3ZN';

const post = (path, body, headers = SESSION) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const get = (path, headers = SESSION) => fetch(`${base}${path}`, { headers });
const trackingScenario = (body, headers = SESSION) => post('/__mock/scenario', body, headers);
const resetSession = (headers = SESSION) => post('/__mock/reset', {}, headers);
const openAccess = async (headers = SESSION) => {
  const res = await post(
    '/api/public/v1/tracking/sessions',
    { protocol: PROTOCOL, accessKey: KEY },
    headers,
  );
  return res.json();
};
const authed = (token, headers = SESSION) => ({ ...headers, Authorization: `Bearer ${token}` });

test('acesso: protocolo e chave simulados abrem acesso com token sentinela e expiração de 15 min', async () => {
  await resetSession();
  const before = Date.now();
  const res = await post('/api/public/v1/tracking/sessions', {
    protocol: PROTOCOL,
    accessKey: KEY,
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['expiresAt', 'token']);
  assert.match(body.token, /^SIMULADA\./);
  const ttl = Date.parse(body.expiresAt) - before;
  assert.ok(ttl > 14 * 60_000 && ttl <= 15 * 60_000 + 1_000);
});

test('acesso: chave errada, protocolo curto e cenário invalid dão 401 genérico, sem repetir o valor', async () => {
  await resetSession();
  for (const body of [
    { protocol: PROTOCOL, accessKey: 'XQZ' },
    { protocol: 'XQZ', accessKey: KEY },
  ]) {
    const res = await post('/api/public/v1/tracking/sessions', body);
    assert.equal(res.status, 401);
    assert.ok(!(await res.text()).includes('XQZ'));
  }
  await trackingScenario({ access: 'invalid' });
  assert.equal(
    (await post('/api/public/v1/tracking/sessions', { protocol: PROTOCOL, accessKey: KEY })).status,
    401,
  );
});

test('acesso: campo extra ou corpo malformado dão 400; rate-limited dá 429; error dá 500', async () => {
  await resetSession();
  const extra = await post('/api/public/v1/tracking/sessions', {
    protocol: PROTOCOL,
    accessKey: KEY,
    x: 'XQZ',
  });
  assert.equal(extra.status, 400);
  assert.ok(!(await extra.text()).includes('XQZ'));
  assert.equal((await post('/api/public/v1/tracking/sessions', '{"protocol":')).status, 400);
  await trackingScenario({ access: 'rate-limited' });
  assert.equal(
    (await post('/api/public/v1/tracking/sessions', { protocol: PROTOCOL, accessKey: KEY })).status,
    429,
  );
  await trackingScenario({ access: 'error' });
  assert.equal(
    (await post('/api/public/v1/tracking/sessions', { protocol: PROTOCOL, accessKey: KEY })).status,
    500,
  );
});

test('guard: /me/* recusa sem token, com token de outra sessão e com cenário unauthorized', async () => {
  await resetSession();
  await resetSession(OTHER);
  assert.equal((await get('/api/public/v1/me/report')).status, 401);
  const { token } = await openAccess(OTHER);
  assert.equal((await get('/api/public/v1/me/report', authed(token))).status, 401);
  const mine = await openAccess();
  assert.equal((await get('/api/public/v1/me/report', authed(mine.token))).status, 200);
  await trackingScenario({ me: 'unauthorized' });
  assert.equal((await get('/api/public/v1/me/messages', authed(mine.token))).status, 401);
});

test('andamento: cada cenário devolve o formato do contrato, sem relato e sem hora', async () => {
  await resetSession();
  const { token } = await openAccess();
  const cases = {
    received: ['RECEIVED', true],
    'in-review': ['IN_REVIEW', true],
    awaiting: ['AWAITING_REPORTER', true],
    'awaiting-overdue': ['AWAITING_REPORTER', true],
    'concluded-substantiated': ['CONCLUDED', false],
    'concluded-partial': ['CONCLUDED', false],
    'concluded-unsubstantiated': ['CONCLUDED', false],
    closed: ['CLOSED', false],
  };
  for (const [report, [status, canReply]] of Object.entries(cases)) {
    await trackingScenario({ report });
    const body = await (await get('/api/public/v1/me/report', authed(token))).json();
    assert.deepEqual(Object.keys(body).sort(), [
      'canReply',
      'category',
      'outcome',
      'receivedOn',
      'replyDeadline',
      'status',
      'timeline',
    ]);
    assert.equal(body.status, status);
    assert.equal(body.canReply, canReply);
    assert.equal(body.outcome !== null, status === 'CONCLUDED');
    assert.equal(body.replyDeadline !== null, status === 'AWAITING_REPORTER');
    assert.match(body.category.name, /SIMULADA/);
    assert.ok(!JSON.stringify(body).match(/T\d{2}:/), 'nenhum horário');
  }
  await trackingScenario({ report: 'awaiting-overdue' });
  const overdue = await (await get('/api/public/v1/me/report', authed(token))).json();
  assert.ok(overdue.replyDeadline < new Date().toISOString().slice(0, 10));
});

test('mensagens: autor em código, só a data, ordem cronológica, nenhuma busca sem pedido', async () => {
  await resetSession();
  const { token } = await openAccess();
  const { items } = await (await get('/api/public/v1/me/messages', authed(token))).json();
  assert.equal(items.length, 3);
  for (const m of items) {
    assert.deepEqual(Object.keys(m).sort(), ['author', 'body', 'id', 'sentOn']);
    assert.ok(['REPORTER', 'TEAM'].includes(m.author));
    assert.match(m.sentOn, /^\d{4}-\d{2}-\d{2}$/);
  }
  assert.deepEqual(
    items.map((m) => m.sentOn),
    [...items.map((m) => m.sentOn)].sort(),
  );
  await post('/__mock/new-team-message', {});
  const after = await (await get('/api/public/v1/me/messages', authed(token))).json();
  assert.equal(after.items.length, 4);
  // A mesma mensagem mantém o id entre leituras; só a nova tem id diferente.
  assert.deepEqual(
    after.items.slice(0, 3).map((m) => m.id),
    items.map((m) => m.id),
  );
  assert.equal(after.items.at(-1).author, 'TEAM');
  const stats = await (await get('/__mock/stats')).json();
  assert.equal(stats.messageReads, 2);
  await trackingScenario({ messages: 'empty' });
  assert.deepEqual(
    (await (await get('/api/public/v1/me/messages', authed(token))).json()).items,
    [],
  );
});

test('envio: 1 e 5.000 caracteres aceitos; 0, 5.001 e campo extra recusados sem repetir o texto', async () => {
  await resetSession();
  const { token } = await openAccess();
  const send = (body) => post('/api/public/v1/me/messages', body, authed(token));
  const one = await send({ body: 'X' });
  assert.equal(one.status, 201);
  assert.equal((await one.json()).author, 'REPORTER');
  assert.equal((await send({ body: 'x'.repeat(5_000) })).status, 201);
  for (const body of [{ body: '' }, { body: 'x'.repeat(5_001) }, { body: 'XQZ', extra: 1 }]) {
    const res = await send(body);
    assert.equal(res.status, 400);
    assert.ok(!(await res.text()).includes('XQZ'));
  }
  const stats = await (await get('/__mock/stats')).json();
  assert.equal(stats.messages, 5);
});

test('envio: responder em awaiting leva o andamento a IN_REVIEW; closed dá 409 e fecha a denúncia', async () => {
  await resetSession();
  const { token } = await openAccess();
  await trackingScenario({ report: 'awaiting' });
  await post('/api/public/v1/me/messages', { body: 'resposta' }, authed(token));
  assert.equal(
    (await (await get('/api/public/v1/me/report', authed(token))).json()).status,
    'IN_REVIEW',
  );
  await trackingScenario({ report: 'received', send: 'closed' });
  const res = await post('/api/public/v1/me/messages', { body: 'resposta' }, authed(token));
  assert.equal(res.status, 409);
  const report = await (await get('/api/public/v1/me/report', authed(token))).json();
  assert.equal(report.status, 'CLOSED');
  assert.equal(report.canReply, false);
});

test('acompanhamento: o simulador não registra protocolo, chave, token nem corpo em log', async () => {
  const lines = [];
  const original = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };
  for (const k of Object.keys(original)) console[k] = (...a) => lines.push(a.join(' '));
  try {
    await resetSession();
    const { token } = await openAccess();
    await post('/api/public/v1/me/messages', { body: 'XQZ-segredo' }, authed(token));
  } finally {
    Object.assign(console, original);
  }
  const out = lines.join('\n');
  for (const secret of ['XQZ-segredo', KEY, PROTOCOL, 'SIMULADA.'])
    assert.ok(!out.includes(secret));
});
