import { expect, test } from '../fixtures/privacy-guards';

/**
 * Cross-Origin-Opener-Policy: same-origin (cabeçalho do nginx). O navegador só aplica o COOP em contexto seguro. Em
 * produção o portal roda em HTTPS; no e2e, o Chromium trata as origens de teste como seguras. O Firefox não tem
 * equivalente e fica de fora (limitação registrada em docs/validacoes/csp.md).
 */
test('COOP aplicado: janela de outra origem aberta pelo portal não recebe window.opener', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'O Firefox só aplica COOP em HTTPS (docs/validacoes/csp.md)',
  );
  await page.goto('/');
  expect(await page.evaluate(() => isSecureContext)).toBe(true);

  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.evaluate(() => void window.open('http://e2e-api:3000/fixture/clean', '_blank')),
  ]);
  await popup.waitForLoadState();
  expect(await popup.evaluate(() => window.opener === null)).toBe(true);
  await popup.close();

  // Controle: entre duas páginas sem COOP, o vínculo existe. Prova que a asserção acima pode falhar.
  const control = await context.newPage();
  await control.goto('http://e2e-api:3000/fixture/clean');
  const [controlPopup] = await Promise.all([
    context.waitForEvent('page'),
    control.evaluate(() => void window.open('http://e2e-api:3000/fixture/clean', '_blank')),
  ]);
  await controlPopup.waitForLoadState();
  expect(await controlPopup.evaluate(() => window.opener !== null)).toBe(true);
});
