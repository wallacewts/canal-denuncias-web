// Testes do check:build (FTRV-11 e feature 002, research R1). Uso: node --test scripts/
// Prova que o script reprova source maps, referências externas e qualquer sentinela do servidor simulado da API.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const SCRIPT = join(import.meta.dirname, 'check-build-output.mjs');

/** Monta um "build" falso com os arquivos dados e roda o script sobre ele. */
function check(files) {
  const dir = mkdtempSync(join(tmpdir(), 'check-build-'));
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, content);
  }
  return spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });
}

test('build limpo passa', () => {
  const result = check({ 'main.js': 'console.info("ok")', 'index.html': '<app-root></app-root>' });
  assert.equal(result.status, 0, result.stderr);
});

for (const sentinel of ['DV-SIMUL', 'SIMULADA', '__mock', 'mock-api']) {
  test(`reprova o build que contém o sentinela do simulador "${sentinel}"`, () => {
    // Texto curto, no meio de outro conteúdo, como apareceria num bundle minificado.
    const result = check({ 'chunk-a.js': `var a=1;var p="${sentinel}";` });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /simulador/);
  });
}

test('reprova sentinela também em arquivos aninhados e em json', () => {
  const result = check({ 'media/config.json': '{"protocolo":"DV-SIMUL-ADO00"}' });
  assert.notEqual(result.status, 0);
});

test('continua reprovando source map e referência externa', () => {
  assert.notEqual(check({ 'main.js.map': '{}' }).status, 0);
  assert.notEqual(check({ 'main.js': 'fetch("https://externo.example/x")' }).status, 0);
});
