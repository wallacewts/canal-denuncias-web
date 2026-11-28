import { expect, test } from '../fixtures/privacy-guards';

/**
 * Todas as rotas que existem hoje no portal (projects/portal/src/app/app.routes.ts), com as guardas de privacidade:
 * nenhuma requisição externa, nenhuma violação de CSP ou Trusted Types, nada no armazenamento e nada no console.
 * Os fluxos completos entram com as features de tela (opção A).
 */
const ROUTES = [
  '/',
  '/privacidade',
  '/nova-denuncia/tipo',
  '/nova-denuncia/categoria',
  '/nova-denuncia/relato',
  '/nova-denuncia/envolvidos',
  '/nova-denuncia/anexos',
  '/nova-denuncia/identificacao',
  '/nova-denuncia/revisao',
  '/nova-denuncia/protocolo',
  '/consultar',
  '/acompanhamento',
  '/ajuda',
];

for (const route of ROUTES) {
  test(`portal ${route} carrega sem rastros`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  });
}

test('o portal não recebe nem envia cookies ao navegar', async ({ page, context }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    // Espera a rota terminar de carregar antes da próxima, como uma pessoa faria.
    await expect(page.locator('h1').first()).toBeVisible();
  }
  expect(await context.cookies()).toEqual([]);
});
