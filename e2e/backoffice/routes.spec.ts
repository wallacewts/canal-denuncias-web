import { expect, test } from '../fixtures/privacy-guards';
import { BACKOFFICE_ROUTES as ROUTES } from './routes';

/**
 * Todas as rotas que existem hoje no backoffice (projects/backoffice/src/app/app.routes.ts), com as guardas de
 * privacidade. O guard de autenticação ainda não existe (feature 05, BAUTH-05).
 */

for (const route of ROUTES) {
  test(`backoffice ${route} carrega sem violações`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  });
}
