import { expect, test } from '../fixtures/privacy-guards';
import { useMockSession } from '../support/mock-api';
import { signInByApi } from './auth-helpers';

/**
 * Proteção contra falsificação de requisição (FR-026, AUTH-07): a API compara a origem da escrita com o Host. O
 * simulador segue o mesmo algoritmo; o proxy do backoffice repassa o Host original.
 */

const SIGN_OUT = 'http://backoffice:8080/api/admin/v1/auth/sign-out';

test('escrita administrativa vinda de outra origem é recusada (403)', async ({ page, request }) => {
  const mock = await useMockSession(page, request);
  const headers = { 'x-mock-session': mock.session };
  const crossSite = await request.post(SIGN_OUT, {
    headers: { ...headers, 'Sec-Fetch-Site': 'cross-site', Origin: 'http://outro.example' },
  });
  expect(crossSite.status()).toBe(403);
  const otherOrigin = await request.post(SIGN_OUT, {
    headers: { ...headers, Origin: 'http://outro.example' },
  });
  expect(otherOrigin.status()).toBe(403);
  expect((await mock.authStats()).crossOriginRejections).toBe(2);
});

test('a mesma escrita feita pela interface (mesma origem, pelo proxy) passa', async ({
  page,
  request,
}) => {
  const mock = await signInByApi(page, request);
  await page.goto('/painel');
  const signOut = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/admin/v1/auth/sign-out',
  );
  await page.locator('mat-toolbar').getByRole('button', { name: 'Sair' }).click();
  expect((await signOut).status()).toBe(204);
  await expect(page).toHaveURL(/\/login$/);
  const stats = await mock.authStats();
  expect(stats.crossOriginRejections).toBe(0);
  expect(stats.sessions).toBe(0);
});
