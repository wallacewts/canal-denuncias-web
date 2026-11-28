// Confere que o cliente gerado está em dia com os contratos versionados em openapi/ (FTRV-01). Usado no CI.
// Regera os dois clientes SEM acesso à rede (modelo de permissões do Node) e falha se algo mudar ou aparecer.
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const GENERATOR = join(root, 'node_modules/ng-openapi-gen/lib/index.js');
const GENERATED = 'projects/shared/src/lib/api/generated';

for (const config of ['ng-openapi-gen.public.json', 'ng-openapi-gen.admin.json']) {
  const result = spawnSync(
    process.execPath,
    ['--permission', '--allow-fs-read=*', '--allow-fs-write=*', GENERATOR, '-c', config],
    { cwd: root, stdio: 'inherit' },
  );
  if (result.status !== 0) {
    console.error(`Falha ao gerar o cliente com ${config}.`);
    process.exit(1);
  }
}

// Diferença entre o que foi gerado agora e o que está no índice do Git (no CI, o índice é o commit), mais arquivos novos.
const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
const changed = git('diff', '--name-only', '--', GENERATED, 'openapi');
const untracked = git('ls-files', '--others', '--exclude-standard', '--', GENERATED, 'openapi');
if (changed.status !== 0 || untracked.status !== 0) {
  console.error(changed.stderr || untracked.stderr);
  process.exit(1);
}
const differences = (changed.stdout + untracked.stdout).trim();
if (differences) {
  console.error(differences);
  console.error(
    'O cliente gerado está desatualizado em relação a openapi/. Rode npm run api:generate e faça commit.',
  );
  process.exit(1);
}
console.log('ok: cliente gerado em dia com openapi/public.json e openapi/admin.json');
