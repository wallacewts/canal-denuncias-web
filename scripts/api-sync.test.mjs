// Testes do api:sync (FTRV-01). Uso: node --test scripts/
// O script roda com o modelo de permissões do Node SEM acesso à rede: se tentasse baixar algo, falharia.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const SCRIPT = join(import.meta.dirname, 'api-sync.mjs');
const CONTRACT = (tag) => JSON.stringify({ openapi: '3.0.0', paths: {}, tags: [{ name: tag }] });

function run(...args) {
  return spawnSync(
    process.execPath,
    ['--permission', '--allow-fs-read=*', '--allow-fs-write=*', SCRIPT, ...args],
    { encoding: 'utf8' },
  );
}

function fixture(files) {
  const from = mkdtempSync(join(tmpdir(), 'api-sync-from-'));
  const to = mkdtempSync(join(tmpdir(), 'api-sync-to-'));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(from, name), content);
  return { from, to };
}

test('copia public.json e admin.json do diretório de origem', () => {
  const { from, to } = fixture({
    'public.json': CONTRACT('public'),
    'admin.json': CONTRACT('admin'),
  });
  const result = run('--from', from, '--to', to);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(to, 'public.json'), 'utf8'), CONTRACT('public'));
  assert.equal(readFileSync(join(to, 'admin.json'), 'utf8'), CONTRACT('admin'));
});

test('falha se faltar um dos contratos e não copia nada', () => {
  const { from, to } = fixture({ 'public.json': CONTRACT('public') });
  const result = run('--from', from, '--to', to);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /admin\.json/);
  assert.equal(existsSync(join(to, 'public.json')), false);
});

test('falha com JSON inválido', () => {
  const { from, to } = fixture({ 'public.json': '{', 'admin.json': CONTRACT('admin') });
  const result = run('--from', from, '--to', to);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /public\.json/);
});

test('falha com arquivo vazio ou que não é um contrato OpenAPI', () => {
  for (const bad of ['', '[]', '{}', '{"openapi":"3.0.0"}']) {
    const { from, to } = fixture({ 'public.json': CONTRACT('public'), 'admin.json': bad });
    const result = run('--from', from, '--to', to);
    assert.notEqual(result.status, 0, `aceitou: ${JSON.stringify(bad)}`);
  }
});

test('falha com opção desconhecida ou sem valor', () => {
  assert.notEqual(run('--de', '/tmp').status, 0);
  assert.notEqual(run('--from').status, 0);
});
