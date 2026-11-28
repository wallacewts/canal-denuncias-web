import { expect, test } from '../fixtures/privacy-guards';
import { callApiThroughApp } from '../support/echo';

/**
 * Proxy /api do backoffice (FTRV-04). Diferente do portal, o IP da equipe é repassado, porque a API audita as ações
 * da equipe (D25, AUDIT-03), e o cookie de sessão vai junto.
 */
test('backoffice: /api chega à API com o caminho completo e o IP repassado', async ({ page }) => {
  await page.goto('/login');
  const echo = await callApiThroughApp(page, '/api/admin/v1/eco');
  expect(echo.path).toBe('/api/admin/v1/eco');
  expect(echo.headers['x-forwarded-for']).toMatch(/\d+\.\d+\.\d+\.\d+/);
  expect(echo.headers['x-real-ip']).toMatch(/\d+\.\d+\.\d+\.\d+/);
});

test('backoffice: o IP real fica por último, mesmo com X-Forwarded-For forjado', async ({
  page,
}) => {
  await page.goto('/login');
  const echo = await callApiThroughApp(page, '/api/admin/v1/eco', {
    'X-Forwarded-For': '203.0.113.9',
  });
  const hops = (echo.headers['x-forwarded-for'] ?? '').split(',').map((h) => h.trim());
  expect(hops.at(-1)).not.toBe('203.0.113.9');
  expect(hops.at(-1)).toBe(echo.headers['x-real-ip']);
});

test('backoffice: o cookie emitido pela API volta nas chamadas seguintes', async ({ page }) => {
  await page.goto('/login');
  await callApiThroughApp(page, '/api/admin/v1/eco');
  const second = await callApiThroughApp(page, '/api/admin/v1/eco');
  expect(second.cookies['XSRF-TOKEN']).toBe('token-de-teste');
});

test('backoffice: a CSP só permite conexões com o próprio endereço', async ({ page }) => {
  const response = await page.goto('/login');
  const csp = response?.headers()['content-security-policy'] ?? '';
  expect(csp).toContain("connect-src 'self';");
});
