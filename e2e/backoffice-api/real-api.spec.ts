import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/privacy-guards';
import { totp } from '../support/totp';

/**
 * Backoffice contra a API real (T048 e T049 da feature 004; T058 da feature 001). Roda com `npm run e2e:api`: o proxy
 * /api do backoffice aponta para a API do repositório canal-denuncias-api, com o cookie real `__Host-sid` (Secure).
 * Os testes sem usuário rodam sempre. Os fluxos com usuário precisam de uma conta de teste (E2E_API_EMAIL e
 * E2E_API_PASSWORD; com o autenticador já cadastrado, também E2E_API_TOTP_SECRET).
 */

const ADMIN = 'http://backoffice:8080/api/admin/v1';
const email = process.env['E2E_API_EMAIL'] ?? '';
const password = process.env['E2E_API_PASSWORD'] ?? '';
const totpSecret = process.env['E2E_API_TOTP_SECRET'] ?? '';

async function signIn(page: Page, userEmail: string, userPassword: string) {
  await page.goto('/login');
  await expect(page.locator('h1')).toHaveText('Entrar');
  await page.getByLabel('E-mail').fill(userEmail);
  await page.getByLabel('Senha').fill(userPassword);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test.describe('sem usuário', () => {
  test('login com credencial inválida: mensagem genérica, nenhum cookie de sessão', async ({
    page,
    context,
  }) => {
    await signIn(page, 'ninguem@exemplo.invalid', 'senha-que-nao-existe-123');
    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect((await context.cookies()).map((c) => c.name)).not.toContain('__Host-sid');
  });

  test('tela interna sem sessão vai ao login, sem mensagem de sessão encerrada', async ({
    page,
  }) => {
    await page.goto('/denuncias');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('end-reason')).toBeEmpty();
  });

  test('escrita administrativa de outra origem é recusada pela API (403); a da interface passa', async ({
    page,
    request,
  }) => {
    const crossSite = await request.post(`${ADMIN}/auth/sign-out`, {
      headers: { 'Sec-Fetch-Site': 'cross-site' },
    });
    expect(crossSite.status()).toBe(403);
    const otherOrigin = await request.post(`${ADMIN}/auth/sign-out`, {
      headers: { Origin: 'http://outro.example' },
    });
    expect(otherOrigin.status()).toBe(403);

    // Mesma escrita feita pela página (mesma origem, pelo proxy, com o Host original): passa a proteção.
    await page.goto('/login');
    const status = await page.evaluate(async () => {
      const res = await fetch('/api/admin/v1/auth/sign-out', { method: 'POST' });
      return res.status;
    });
    expect(status).toBe(204);
  });
});

test.describe('com usuário de teste', () => {
  test.skip(!email || !password, 'sem conta de teste (E2E_API_EMAIL e E2E_API_PASSWORD)');

  test('entrada completa até o painel, menu pelas permissões do /me, perfil e saída', async ({
    page,
    context,
  }) => {
    test.skip(!totpSecret, 'conta sem segredo do autenticador (E2E_API_TOTP_SECRET)');
    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/login\/codigo$/);
    const sid = (await context.cookies()).find((c) => c.name === '__Host-sid');
    expect(sid).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Strict' });
    await page.getByLabel('Código de seis dígitos').fill(totp(totpSecret));
    await page.getByRole('button', { name: 'Verificar' }).click();
    await expect(page).toHaveURL(/\/painel$/);
    await expect(page.getByRole('navigation', { name: 'Menu' }).getByRole('link')).not.toHaveCount(
      0,
    );

    await page.goto('/perfil');
    await expect(page.getByTestId('profile-data')).toContainText(email);

    await page.locator('mat-toolbar').getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('end-reason')).toHaveText('Você saiu do backoffice.');
    await page.goto('/painel');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('código do autenticador errado: erro no campo (422) e a sessão pendente continua', async ({
    page,
  }) => {
    test.skip(!totpSecret, 'conta sem segredo do autenticador (E2E_API_TOTP_SECRET)');
    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/login\/codigo$/);
    const wrong = totp(totpSecret) === '000000' ? '111111' : '000000';
    await page.getByLabel('Código de seis dígitos').fill(wrong);
    await page.getByRole('button', { name: 'Verificar' }).click();
    await expect(page.getByText('Código inválido. Confira e tente de novo.')).toBeVisible();
    await expect(page).toHaveURL(/\/login\/codigo$/);
    await page.getByLabel('Código de seis dígitos').fill(totp(totpSecret));
    await page.getByRole('button', { name: 'Verificar' }).click();
    await expect(page).toHaveURL(/\/painel$/);
  });

  test('primeiro acesso de uma conta sem autenticador: cadastro com o segredo da tela, códigos, painel e nova entrada', async ({
    page,
  }) => {
    test.skip(!!totpSecret, 'conta já tem autenticador (E2E_API_TOTP_SECRET informado)');
    test.setTimeout(90_000);
    await signIn(page, email, password);
    if (page.url().endsWith('/primeiro-acesso/senha')) {
      throw new Error(
        'a conta de teste exige troca de senha: use uma conta com a senha definitiva',
      );
    }
    await expect(page).toHaveURL(/\/primeiro-acesso\/autenticador$/);
    await expect(page.locator('img[src^="data:image/png;base64,"]')).toBeVisible();
    const secret = ((await page.getByTestId('secret').textContent()) ?? '').replace(/\s/g, '');
    await page.getByLabel('Código de seis dígitos').fill(totp(secret));
    await page.getByRole('button', { name: 'Ativar' }).click();
    await expect(page).toHaveURL(/\/primeiro-acesso\/codigos$/);
    await expect(page.getByTestId('code')).toHaveCount(10);
    await page.getByLabel('Guardei os códigos de recuperação').check();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page).toHaveURL(/\/painel$/);

    await page.locator('mat-toolbar').getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/login\/codigo$/);
    // O mesmo código não vale duas vezes na mesma janela de 30 s: espera a próxima.
    await page.waitForTimeout(31_000 - (Date.now() % 30_000));
    await page.getByLabel('Código de seis dígitos').fill(totp(secret));
    await page.getByRole('button', { name: 'Verificar' }).click();
    await expect(page).toHaveURL(/\/painel$/);
  });
});
