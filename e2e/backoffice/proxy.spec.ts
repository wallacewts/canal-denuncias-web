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
  expect(second.cookies['cookie-de-teste']).toBe('valor-de-teste');
});

test('backoffice: Host original e a origem da escrita chegam à API (proteção por origem, AUTH-07)', async ({
  page,
}) => {
  await page.goto('/login');
  // Escrita (POST) feita pela interface: o navegador envia Sec-Fetch-Site (Chromium) ou, sem ele, Origin (Firefox em
  // HTTP, que só envia Sec-Fetch-* em contexto seguro). A API compara Origin com o Host, por isso o proxy repassa o Host
  // original com a porta.
  const echo = await page.evaluate(async () => {
    const response = await fetch('/api/admin/v1/eco', { method: 'POST', body: '{}' });
    return (await response.json()) as { headers: Record<string, string | undefined> };
  });
  expect(echo.headers['host']).toBe('backoffice:8080');
  const site = echo.headers['sec-fetch-site'];
  if (site) expect(site).toBe('same-origin');
  else expect(echo.headers['origin']).toBe('http://backoffice:8080');
});

test('backoffice: a CSP só permite conexões com o próprio endereço', async ({ page }) => {
  const response = await page.goto('/login');
  const csp = response?.headers()['content-security-policy'] ?? '';
  expect(csp).toContain("connect-src 'self';");
});
