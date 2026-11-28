import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/privacy-guards';
import { STAFF, useMockSession } from '../support/mock-api';

/** BAUTH-03 e BAUTH-04 contra o simulador (feature 004, US2). As guardas de privacidade valem em todos os testes. */

const NEW_PASSWORD = 'nova-senha-bem-longa-SIMULADA';

async function startFirstAccess(page: Page) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(STAFF.primeiroAcesso);
  await page.getByLabel('Senha').fill(STAFF.provisionalPassword);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/primeiro-acesso\/senha$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
}

async function changePassword(page: Page, current: string, next: string) {
  await page.getByLabel('Senha atual').fill(current);
  await page.getByLabel('Nova senha', { exact: true }).fill(next);
  await page.getByLabel('Confirme a nova senha').fill(next);
  await page.getByRole('button', { name: 'Trocar senha' }).click();
}

async function reachRecoveryCodes(page: Page) {
  await startFirstAccess(page);
  await changePassword(page, STAFF.provisionalPassword, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/primeiro-acesso\/autenticador$/);
  await expect(page.locator('img[src^="data:image/png;base64,"]')).toBeVisible();
  await page.getByLabel('Código de seis dígitos').fill(STAFF.totp);
  await page.getByRole('button', { name: 'Ativar' }).click();
  await expect(page).toHaveURL(/\/primeiro-acesso\/codigos$/);
}

test('primeiro acesso completo: senha, autenticador, códigos e painel', async ({
  page,
  request,
}) => {
  await useMockSession(page, request);
  await reachRecoveryCodes(page);
  await expect(page.getByTestId('code')).toHaveCount(10);
  const continueButton = page.getByRole('button', { name: 'Continuar' });
  await expect(continueButton).toBeDisabled();
  await page.getByLabel('Guardei os códigos de recuperação').check();
  await continueButton.click();
  await expect(page).toHaveURL(/\/painel$/);
});

test('senha curta é barrada na tela; senha comum é recusada pela API', async ({
  page,
  request,
}) => {
  await useMockSession(page, request);
  await startFirstAccess(page);
  await changePassword(page, STAFF.provisionalPassword, 'XQZ');
  await expect(page.getByText('A nova senha precisa ter pelo menos 12 caracteres.')).toBeVisible();
  await expect(page).toHaveURL(/\/primeiro-acesso\/senha$/);
  await changePassword(page, STAFF.provisionalPassword, 'senhasenha123');
  await expect(page.getByText('Essa senha é comum demais. Escolha outra.')).toBeVisible();
  await expect(page.getByLabel('Senha atual')).toHaveValue('');
});

test('código inválido não ativa o autenticador', async ({ page, request }) => {
  await useMockSession(page, request);
  await startFirstAccess(page);
  await changePassword(page, STAFF.provisionalPassword, NEW_PASSWORD);
  await page.getByLabel('Código de seis dígitos').fill('000000');
  await page.getByRole('button', { name: 'Ativar' }).click();
  await expect(page.getByRole('alert')).toHaveText('Código inválido. Confira e tente de novo.');
  await expect(page).toHaveURL(/\/primeiro-acesso\/autenticador$/);
});

test('códigos de recuperação: arquivo baixado com nome fixo, e não reaparecem ao recarregar', async ({
  page,
  request,
}) => {
  await useMockSession(page, request);
  await reachRecoveryCodes(page);
  const first = await page.getByTestId('code').first().textContent();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar arquivo' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('codigos-de-recuperacao.txt');
  const content = await readFile((await download.path()) as string, 'utf8');
  expect(content).toContain(first ?? 'x');
  // Firefox aborta um chunk em download ao recarregar e acusa falha de SRI (mesmo caso das features 002 e 003).
  await page.waitForLoadState('networkidle');
  await page.reload();
  await expect(page.getByTestId('code')).toHaveCount(0);
  await expect(page.getByText('já foram exibidos')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(/\/painel$/);
});

test('as etapas do primeiro acesso não abrem pelo endereço', async ({ page, request }) => {
  await useMockSession(page, request);
  await page.goto('/primeiro-acesso/autenticador');
  await expect(page).toHaveURL(/\/login$/);
  await startFirstAccess(page);
  await page.goto('/primeiro-acesso/autenticador');
  await expect(page).toHaveURL(/\/login$/);
});
