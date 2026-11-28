import type { APIRequestContext, Page } from '@playwright/test';
import { STAFF, useMockSession, type MockScenario } from '../support/mock-api';

/**
 * Entra no backoffice pela API simulada, na mesma origem (pelo proxy /api), sem passar pela tela de login: o
 * navegador guarda o cookie HttpOnly e o guard restaura a sessão pelo /me na próxima navegação. Usado pelos testes de
 * telas que não são o fluxo de entrada.
 */
export async function signInByApi(
  page: Page,
  request: APIRequestContext,
  account: string = STAFF.pronta,
  scenario: MockScenario = {},
) {
  const mock = await useMockSession(page, request, scenario);
  await page.goto('/login');
  await page.evaluate(
    async ({ email, password, code }) => {
      const post = (url: string, body: unknown) =>
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      const signIn = await post('/api/admin/v1/auth/sign-in', { email, password });
      if (!signIn.ok) throw new Error(`sign-in ${signIn.status}`);
      const mfa = await post('/api/admin/v1/auth/mfa/challenge', { code });
      if (!mfa.ok) throw new Error(`mfa ${mfa.status}`);
    },
    { email: account, password: STAFF.password, code: STAFF.totp },
  );
  return mock;
}
