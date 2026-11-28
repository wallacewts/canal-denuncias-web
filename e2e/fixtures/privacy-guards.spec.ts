import { expect, test } from './privacy-guards';

/**
 * Testes da própria fixture: cada guarda precisa reprovar o comportamento que ela vigia.
 * As páginas /fixture/* são servidas pelo e2e-api (tools/mock-api/server.mjs), que é a "origem do app" neste projeto.
 * Cada teste confere a violação esperada e a consome com takeViolations(), para a checagem final da fixture passar.
 */

const kinds = (guards: { violations(): { kind: string }[] }) =>
  guards.violations().map((v) => v.kind);

test('página limpa não gera violação', async ({ page, privacyGuards }) => {
  await page.goto('/fixture/clean');
  await expect(page.getByRole('heading', { name: 'Página limpa' })).toBeVisible();
  await privacyGuards.checkStorage();
  expect(privacyGuards.takeViolations()).toEqual([]);
});

test('reprova requisição para origem diferente da do app', async ({ page, privacyGuards }) => {
  await page.goto('/fixture/external');
  await expect.poll(() => kinds(privacyGuards)).toContain('rede');
  // Espera a requisição externa terminar (o Firefox registra o erro de CORS no console depois dela).
  await page.waitForLoadState('networkidle');
  privacyGuards.takeViolations();
});

test('reprova valor sensível na URL', async ({ page, privacyGuards }) => {
  privacyGuards.trackSensitive('DV-TESTE-SEGREDO');
  await page.goto('/fixture/url');
  await expect.poll(() => kinds(privacyGuards)).toContain('url');
  privacyGuards.takeViolations();
});

test('reprova violação da política de segurança de conteúdo', async ({ page, privacyGuards }) => {
  await page.goto('/fixture/csp');
  await expect.poll(() => kinds(privacyGuards)).toContain('csp');
  privacyGuards.takeViolations();
});

test('reprova dado guardado no navegador', async ({ page, privacyGuards }) => {
  await page.goto('/fixture/storage');
  await expect(page.getByRole('heading', { name: 'Armazenamento' })).toBeVisible();
  await privacyGuards.checkStorage();
  expect(kinds(privacyGuards)).toContain('armazenamento');
  privacyGuards.takeViolations();
  // Limpa o rastro que a página de teste gravou, para a checagem final da fixture passar.
  // eslint-disable-next-line no-restricted-globals
  await page.evaluate(() => localStorage.clear());
});

test('reprova console.error do app', async ({ page, privacyGuards }) => {
  await page.goto('/fixture/console');
  await expect.poll(() => kinds(privacyGuards)).toContain('console');
  privacyGuards.takeViolations();
});
