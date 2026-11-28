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
