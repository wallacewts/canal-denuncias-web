import { expect, test } from '../fixtures/privacy-guards';
import { signInByApi } from './auth-helpers';
import { BACKOFFICE_ROUTES as ROUTES } from './routes';

/**
 * Todas as rotas do backoffice (projects/backoffice/src/app/app.routes.ts), com as guardas de privacidade. Com o guard
 * de autenticação (feature 004, BAUTH-05), as rotas internas exigem sessão: o teste entra pela API simulada antes de
 * visitá-las. O login continua aberto.
 */
for (const route of ROUTES) {
  test(`backoffice ${route} carrega sem violações`, async ({ page, request }) => {
    if (route !== '/login') await signInByApi(page, request);
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`${route.replace(/[/-]/g, '\\$&')}$`));
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  });
}
