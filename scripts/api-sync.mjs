// Copia os contratos da API para openapi/ (FTRV-01). Nunca acessa a rede.
//   npm run api:sync                       -> lê ../canal-denuncias-api/openapi/ (repositório local da API)
//   npm run api:sync -- --from <dir>       -> lê outro diretório (ex.: artefato baixado do CI da API)
// Valida os dois arquivos antes de copiar: se um faltar ou for inválido, nada é copiado.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FILES = ['public.json', 'admin.json'];
const root = resolve(import.meta.dirname, '..');
const options = { from: join(root, '../canal-denuncias-api/openapi'), to: join(root, 'openapi') };

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const key = args[i]?.replace(/^--/, '');
  const value = args[i + 1];
  if (
    !(key in options) ||
    !args[i].startsWith('--') ||
    value === undefined ||
    value.startsWith('--')
  ) {
    console.error(`Uso: api-sync [--from <dir>] [--to <dir>]. Opção inválida: ${args[i]}`);
    process.exit(2);
  }
  options[key] = resolve(value);
}

function readContract(file) {
  const path = join(options.from, file);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(
      `${file}: não foi possível ler um JSON válido em ${path} (${error.code ?? error.message})`,
    );
  }
  const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
  if (!isObject(parsed) || typeof parsed.openapi !== 'string' || !isObject(parsed.paths)) {
    throw new Error(`${file}: não é um contrato OpenAPI (faltam "openapi" ou "paths")`);
  }
  return path;
}

try {
  const sources = FILES.map(readContract);
  mkdirSync(options.to, { recursive: true });
  sources.forEach((source, i) => copyFileSync(source, join(options.to, FILES[i])));
  console.log(`Contratos copiados de ${options.from} para ${options.to}: ${FILES.join(', ')}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
