// Prova que as regras de privacidade do lint continuam valendo (FTRV-11, constituição I e V).
// Roda o ESLint do projeto sobre trechos de código e falha se alguma regra deixar de reprovar o que deve.
// Uso: node scripts/check-lint-rules.mjs
import { ESLint } from 'eslint';

const eslint = new ESLint();

/** Cada caso: arquivo virtual, código e a regra que deve (ou não) disparar. */
const cases = [
  {
    file: 'projects/portal/src/app/probe.ts',
    code: "console.log('x');",
    rule: 'no-console',
    expect: true,
  },
  {
    file: 'projects/backoffice/src/app/probe.ts',
    code: "console.error('x');",
    rule: 'no-console',
    expect: true,
  },
  {
    file: 'projects/shared/src/lib/probe.ts',
    code: "console.warn('x');",
    rule: 'no-console',
    expect: true,
  },
  {
    file: 'projects/portal/src/app/probe.spec.ts',
    code: "console.log('x');",
    rule: 'no-console',
    expect: false,
  },
  {
    file: 'projects/portal/src/app/probe.ts',
    code: "localStorage.setItem('a', 'b');",
    rule: 'no-restricted-globals',
    expect: true,
  },
  {
    file: 'projects/portal/src/app/probe.ts',
    code: "sessionStorage.setItem('a', 'b');",
    rule: 'no-restricted-globals',
    expect: true,
  },
  {
    file: 'projects/portal/src/app/probe.ts',
    code: "document.cookie = 'a=b';",
    rule: 'no-restricted-properties',
    expect: true,
  },
  {
    file: 'projects/portal/src/app/probe.ts',
    code: "import * as admin from '@canal/shared/api/admin';\nexport const x = admin;",
    rule: 'no-restricted-imports',
    expect: true,
  },
  {
    file: 'projects/backoffice/src/app/probe.ts',
    code: "import * as admin from '@canal/shared/api/admin';\nexport const x = admin;",
    rule: 'no-restricted-imports',
    expect: false,
  },
];

let failures = 0;
for (const { file, code, rule, expect } of cases) {
  const [result] = await eslint.lintText(code, { filePath: file });
  const fired = result.messages.some((m) => m.ruleId === rule);
  const ok = fired === expect;
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${rule} ${expect ? 'reprova' : 'aceita'} em ${file}`);
}

if (failures) {
  console.error(`\n${failures} regra(s) de privacidade do lint não se comportaram como esperado.`);
  process.exit(1);
}
