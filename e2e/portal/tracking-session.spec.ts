import { expect, test } from '../fixtures/privacy-guards';
import { MOCK_RECEIPT, useMockSession } from '../support/mock-api';
import { openTracking } from './tracking-helpers';

/** Acesso só em memória (feature 003): recarga, rota direta e URL colada nunca mostram a denúncia. */
test.describe('acesso do denunciante', () => {
  test.beforeEach(({ privacyGuards }) => {
    privacyGuards.trackSensitive(MOCK_RECEIPT.protocol);
    privacyGuards.trackSensitive(MOCK_RECEIPT.accessKey);
    privacyGuards.trackSensitive('SIMULADA.');
  });

  test('recarregar o acompanhamento encerra o acesso e volta para a consulta', async ({
    page,
    request,
  }) => {
    await openTracking(page, request);
    await page.reload();
    await expect(page).toHaveURL(/\/consultar$/);
    await expect(page.getByTestId('status')).toHaveCount(0);
  });

  test('abrir /acompanhamento direto, sem acesso, leva para a consulta', async ({
    page,
    request,
  }) => {
    await useMockSession(page, request);
    await page.goto('/acompanhamento');
    await expect(page).toHaveURL(/\/consultar$/);
    await expect(page.locator('h1')).toHaveText('Consultar denúncia');
  });

  test('dados colados na URL são ignorados', async ({ page, request }) => {
    await useMockSession(page, request);
    await page.goto('/acompanhamento?protocolo=DV-TESTE-COLADO');
    await expect(page).toHaveURL(/\/consultar$/);
    await expect(page.getByLabel('Protocolo', { exact: true })).toHaveValue('');
  });
});
