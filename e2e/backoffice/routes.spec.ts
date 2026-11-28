import { expect, test } from '../fixtures/privacy-guards';

/**
 * Todas as rotas que existem hoje no backoffice (projects/backoffice/src/app/app.routes.ts), com as guardas de
 * privacidade. O guard de autenticação ainda não existe (feature 05, BAUTH-05).
 */
const ROUTES = [
  '/login',
  '/painel',
  '/denuncias',
  '/denuncias/0193a7b0-0000-7000-8000-000000000000',
  '/triagem',
  '/relatorios',
  '/usuarios',
  '/configuracoes',
  '/auditoria',
  '/perfil',
];

for (const route of ROUTES) {
  test(`backoffice ${route} carrega sem violações`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  });
}
