// Confere o build de produção (FTRV-11, constituição I e VII): sem source maps publicados e sem referência a
// domínio externo. Uso: npm run build && node scripts/check-build-output.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const APPS = ['dist/portal/browser', 'dist/backoffice/browser'];

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
    const urls = readFileSync(file, 'utf8').match(/https?:\/\/[\w.:%/#?=&-]+/g) ?? [];
    for (const url of new Set(urls)) {
      if (!ALLOWED.some((re) => re.test(url)))
        problems.push(`referência externa em ${file}: ${url}`);
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} problema(s) no build de produção.`);
  process.exit(1);
}
console.log(`ok: ${APPS.join(' e ')} sem source maps e sem referência externa`);
