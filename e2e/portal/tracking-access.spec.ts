import { expect, test } from '../fixtures/privacy-guards';
import { MOCK_RECEIPT, useMockSession } from '../support/mock-api';
import { submitAccess, TRACKING_TITLE } from './tracking-helpers';

/** Consulta da denúncia (US1 da feature 003, PACC-02) contra o simulador, com as guardas de privacidade ativas. */
test.describe('consulta da denúncia', () => {
  test.beforeEach(({ privacyGuards }) => {
    privacyGuards.trackSensitive(MOCK_RECEIPT.protocol);
    privacyGuards.trackSensitive(MOCK_RECEIPT.accessKey);
    privacyGuards.trackSensitive('SIMULADA.');
  });

  test('protocolo em minúsculas e sem hífens é normalizado e abre o acompanhamento com foco no título', async ({
    page,
    request,
  }) => {
    await useMockSession(page, request);
    await page.goto('/consultar');
    await submitAccess(page, 'dv simul ado00');
    await expect(page.locator('h1')).toHaveText(TRACKING_TITLE);
    await expect(page.locator('h1')).toBeFocused();
    await expect(page).toHaveURL(/\/acompanhamento$/);
    expect(await page.title()).not.toContain(MOCK_RECEIPT.protocol);
  });

  test('a chave fica oculta, com botão para mostrar e ocultar', async ({ page, request }) => {
    await useMockSession(page, request);
    await page.goto('/consultar');
    const key = page.getByLabel('Chave de acesso', { exact: true });
    await expect(key).toHaveAttribute('type', 'password');
    const toggle = page.getByRole('button', { name: 'Mostrar chave' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(key).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: 'Ocultar chave' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  for (const [name, scenario, key] of [
    ['chave errada', {}, 'XQZ'],
    ['dados recusados pela API', { access: 'invalid' as const }, MOCK_RECEIPT.accessKey],
    ['muitas tentativas', { access: 'rate-limited' as const }, MOCK_RECEIPT.accessKey],
  ] as const) {
    test(`${name}: sempre a mesma mensagem genérica, anunciada, com os campos mantidos`, async ({
      page,
      request,
    }) => {
      await useMockSession(page, request, scenario);
      await page.goto('/consultar');
      await submitAccess(page, MOCK_RECEIPT.protocol, key);
      await expect(page.getByRole('alert')).toHaveText('Protocolo ou chave inválidos.');
      await expect(page.getByLabel('Protocolo', { exact: true })).toHaveValue(
        MOCK_RECEIPT.protocol,
      );
      await expect(page.getByLabel('Chave de acesso', { exact: true })).toHaveValue(key);
      await expect(page).toHaveURL(/\/consultar$/);
      // Nenhuma mensagem padrão de erro além da genérica.
      await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);
    });
  }

  test('clique duplo em Consultar faz uma só abertura de acesso', async ({ page, request }) => {
    const mock = await useMockSession(page, request, { access: 'slow' });
    await page.goto('/consultar');
    await page.getByLabel('Protocolo', { exact: true }).fill(MOCK_RECEIPT.protocol);
    await page.getByLabel('Chave de acesso', { exact: true }).fill(MOCK_RECEIPT.accessKey);
    await page.getByRole('button', { name: 'Consultar', exact: true }).dblclick();
    await expect(page.getByRole('status').filter({ hasText: 'Consultando' })).toBeVisible();
    await expect(page.locator('h1')).toHaveText(TRACKING_TITLE);
    expect((await mock.stats()).sessions).toBe(1);
  });
});
