import { expect, test } from '../fixtures/privacy-guards';
import { callApiThroughApp } from '../support/echo';

/**
 * Proxy /api do portal (FTRV-04). O IP e os cookies do denunciante nunca chegam à API (constituição, princípio I).
 * A "API" aqui é o servidor de eco do e2e.
 */
const SPOOFED = {
  'X-Forwarded-For': '203.0.113.9',
  'X-Real-IP': '203.0.113.9',
  Forwarded: 'for=203.0.113.9',
};

test('portal: /api chega à API com o caminho completo', async ({ page }) => {
  await page.goto('/');
  const echo = await callApiThroughApp(page, '/api/public/v1/eco');
  expect(echo.path).toBe('/api/public/v1/eco');
  expect(echo.method).toBe('GET');
});

test('portal: nenhum cabeçalho de IP chega à API, nem forjado pelo cliente', async ({ page }) => {
  await page.goto('/');
  const echo = await callApiThroughApp(page, '/api/public/v1/eco', SPOOFED);
  expect(echo.headers['x-forwarded-for']).toBeUndefined();
  expect(echo.headers['x-real-ip']).toBeUndefined();
  expect(echo.headers['forwarded']).toBeUndefined();
});

test('portal: cookies não vão para a API nem ficam no navegador', async ({ page, context }) => {
  await page.goto('/');
  await callApiThroughApp(page, '/api/public/v1/eco');
  const second = await callApiThroughApp(page, '/api/public/v1/eco');
  expect(second.headers['cookie']).toBeUndefined();
  expect(second.cookies).toEqual({});
  expect(await context.cookies()).toEqual([]);
});

test('portal: a CSP só permite conexões com o próprio endereço', async ({ page }) => {
  const response = await page.goto('/');
  const csp = response?.headers()['content-security-policy'] ?? '';
  expect(csp).toContain("connect-src 'self';");
  expect(csp).not.toMatch(/connect-src[^;]*(http|localhost)/);
});
