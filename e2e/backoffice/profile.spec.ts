import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/privacy-guards';
import { STAFF } from '../support/mock-api';
import { signInByApi } from './auth-helpers';
import { reloadWhenSettled } from '../support/reload';

/** BPRF-01 e BPRF-02 contra o simulador (feature 004, US5). */

const MOCK = 'http://e2e-api:3000';

async function changePassword(page: Page, current: string, next: string) {
  await page.getByLabel('Senha atual').fill(current);
  await page.getByLabel('Nova senha', { exact: true }).fill(next);
  await page.getByLabel('Confirme a nova senha').fill(next);
  await page.getByRole('button', { name: 'Trocar senha' }).click();
}

test('Meu perfil mostra nome, e-mail, perfis e a data de ativação do segundo fator', async ({
  page,
  request,
}) => {
  await signInByApi(page, request);
  await page.goto('/perfil');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meu perfil');
  const data = page.getByTestId('profile-data');
  await expect(data).toContainText('Pessoa Pronta SIMULADA');
  await expect(data).toContainText(STAFF.pronta);
  await expect(data).toContainText('Gestão de compliance');
  await expect(data).toContainText(/10\/01\/2026 \d{2}:00:00/);
});

test('troca de senha: senha comum, igual à atual e senha atual errada ficam no campo; sucesso avisa e encerra as outras sessões', async ({
  page,
  request,
}) => {
  const mock = await signInByApi(page, request);
  // Outra sessão aberta da mesma pessoa (outro navegador).
  const other = await request.post(`${MOCK}/api/admin/v1/auth/sign-in`, {
    headers: { 'x-mock-session': mock.session },
    data: { email: STAFF.pronta, password: STAFF.password },
  });
  expect(other.status()).toBe(200);
  expect((await mock.authStats()).sessions).toBe(2);

  await page.goto('/perfil');
  await changePassword(page, STAFF.password, 'senhasenha123');
  await expect(page.getByText('Essa senha é comum demais. Escolha outra.')).toBeVisible();
  await expect(page.getByLabel('Senha atual')).toHaveValue('');

  await changePassword(page, STAFF.password, STAFF.password);
  await expect(page.getByText('A nova senha precisa ser diferente da atual.')).toBeVisible();

  await changePassword(page, 'senha-errada-XQZ', 'nova-senha-bem-longa-SIMULADA');
  await expect(page.getByText('Senha atual incorreta.')).toBeVisible();
  await expect(page).toHaveURL(/\/perfil$/);

  await changePassword(page, STAFF.password, 'nova-senha-bem-longa-SIMULADA');
  await expect(page.getByTestId('password-changed')).toHaveText(
    'Senha trocada. Sua sessão foi renovada e as outras sessões abertas foram encerradas.',
  );
  await expect(page.getByText('Senha atual incorreta.')).toHaveCount(0);
  expect((await mock.authStats()).sessions).toBe(1);
  // A sessão renovada (cookie novo) continua valendo.
  await reloadWhenSettled(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meu perfil');
});

test('5ª senha atual errada: 429, volta ao login com a mensagem de sessão terminada e sem dados', async ({
  page,
  request,
}) => {
  await signInByApi(page, request);
  await page.goto('/perfil');
  for (let i = 1; i <= 4; i++) {
    await changePassword(page, `senha-errada-${i}`, 'nova-senha-bem-longa-SIMULADA');
    await expect(page.getByText('Senha atual incorreta.')).toBeVisible();
    await expect(page).toHaveURL(/\/perfil$/);
  }
  await changePassword(page, 'senha-errada-5', 'nova-senha-bem-longa-SIMULADA');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId('end-reason')).toHaveText(
    'Sua sessão terminou. Entre de novo para continuar.',
  );
  await expect(page.getByText('Pessoa Pronta SIMULADA')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Menu' })).toHaveCount(0);
  // A sessão acabou também na API: abrir o perfil de novo leva ao login.
  await page.goto('/perfil');
  await expect(page).toHaveURL(/\/login$/);
});
