// Confere o build de produção (FTRV-11, constituição I e VII): sem source maps publicados, sem referência a domínio
// externo, sem nada do servidor simulado da API (feature 002, research R1) e sem o barril da lib no bundle inicial
// (feature 003). Uso: npm run build && node scripts/check-build-output.mjs [diretórios...]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const APPS =
  process.argv.length > 2
    ? process.argv.slice(2)
    : ['dist/portal/browser', 'dist/backoffice/browser'];

// Valores que só o servidor simulado usa (tools/mock-api). Se aparecerem no build, código de teste vazou para produção.
const MOCK_SENTINELS = ['DV-SIMUL', 'SIMULADA', '__mock', 'mock-api'];

// URLs literais que o Angular deixa no bundle e que não são requisições: namespaces do W3C, o link de documentação
// de uma mensagem de segurança e a base fictícia que o roteador usa para fazer parsing de URL.
const ALLOWED = [
  /^http:\/\/www\.w3\.org\/(2000\/svg|1998\/Math\/MathML|XML\/1998\/namespace|2000\/xmlns\/|1999\/xlink|1999\/xhtml)$/,
  /^https:\/\/angular\.dev\/best-practices\/security#[\w-]+$/,
  /^http:\/\/fake$/,
  /^https?:\/\/localhost(:\d+)?(\/.*)?$/,
];

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });

const problems = [];
for (const app of APPS) {
  for (const file of files(app)) {
    if (file.endsWith('.map')) problems.push(`source map publicado: ${file}`);
    if (!/\.(js|css|html|json)$/.test(file)) continue;
    const content = readFileSync(file, 'utf8');
    for (const sentinel of MOCK_SENTINELS) {
      if (content.includes(sentinel))
        problems.push(`sentinela do simulador "${sentinel}" em ${file}`);
    }
    const urls = content.match(/https?:\/\/[\w.:%/#?=&-]+/g) ?? [];
    for (const url of new Set(urls)) {
      if (!ALLOWED.some((re) => re.test(url)))
        problems.push(`referência externa em ${file}: ${url}`);
    }
  }
}

// Barril da lib no bundle inicial (feature 003): quando código carregado sob demanda importa de `@canal/shared` um
// símbolo que já está no bundle inicial, o build coloca o barril inteiro, com todos os componentes da lib, no bundle
// inicial (+100 kB). As estatísticas do build (`ng build --stats-json`, gravadas ao lado do diretório) mostram isso:
// o barril passa a aparecer entre as entradas do chunk `main` (mesmo com 0 byte próprio), seguido dos componentes da
// lib. Num build saudável, o `main` usa os arquivos da lib diretamente e o barril não aparece.
const BARREL = 'projects/shared/src/public-api.ts';
for (const app of APPS) {
  const statsFile = join(dirname(app), `${basename(app)}-stats.json`);
  if (!existsSync(statsFile)) {
    problems.push(
      `estatísticas do build ausentes (${statsFile}): rode o build com --stats-json para conferir o barril da lib`,
    );
    continue;
  }
  const outputs = JSON.parse(readFileSync(statsFile, 'utf8')).outputs ?? {};
  for (const [name, output] of Object.entries(outputs)) {
    if (!/(^|\/)main-[^/]*\.js$/.test(name)) continue;
    if (Object.keys(output.inputs ?? {}).some((input) => input.endsWith(BARREL)))
      problems.push(
        `barril @canal/shared no bundle inicial de ${app}: código carregado sob demanda importa do barril um símbolo que ` +
          'já está no bundle inicial; importe de uma entrada secundária (ex.: @canal/shared/http)',
      );
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} problema(s) no build de produção.`);
  process.exit(1);
}
console.log(
  `ok: ${APPS.join(' e ')} sem source maps, sem referência externa e sem o barril da lib no bundle inicial`,
);
