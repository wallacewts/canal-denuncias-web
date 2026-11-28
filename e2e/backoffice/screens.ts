import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '../fixtures/privacy-guards';
import { STAFF, useMockSession } from '../support/mock-api';
import { signInByApi } from './auth-helpers';

/**
 * Percorre as telas do acesso da equipe que só abrem com estado (etapa em memória, erro na tela, aviso) e chama
 * `check` em cada uma. Usado pelos testes de acessibilidade e de largura estreita (T050 da feature 004).
 */
export type ScreenCheck = (screen: string) => Promise<void>;

export async function walkSignInScreens(
  page: Page,
  request: APIRequestContext,
  check: ScreenCheck,
) {
  await useMockSession(page, request);
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(STAFF.pronta);
  await page.getByLabel('Senha').fill('senha-errada-XQZ');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();
  await check('login com erro');

  await page.getByLabel('Senha').fill(STAFF.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/login\/codigo$/);
  await page.getByLabel('Código de seis dígitos').fill('000000');
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page.getByText('Código inválido. Confira e tente de novo.')).toBeVisible();
  await check('desafio com erro no campo');

  await page.getByTestId('use-recovery').click();
  await expect(page.getByLabel('Código de recuperação')).toBeVisible();
  await check('desafio com código de recuperação');
}

export async function walkFirstAccessScreens(
  page: Page,
  request: APIRequestContext,
  check: ScreenCheck,
) {
  await useMockSession(page, request);
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(STAFF.primeiroAcesso);
  await page.getByLabel('Senha').fill(STAFF.provisionalPassword);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/primeiro-acesso\/senha$/);
  await page.getByLabel('Senha atual').fill(STAFF.provisionalPassword);
  await page.getByLabel('Nova senha', { exact: true }).fill('senhasenha123');
  await page.getByLabel('Confirme a nova senha').fill('senhasenha123');
  await page.getByRole('button', { name: 'Trocar senha' }).click();
  await expect(page.getByText('Essa senha é comum demais. Escolha outra.')).toBeVisible();
  await check('troca de senha com erro');

  await page.getByLabel('Senha atual').fill(STAFF.provisionalPassword);
  await page.getByLabel('Nova senha', { exact: true }).fill('nova-senha-bem-longa-SIMULADA');
  await page.getByLabel('Confirme a nova senha').fill('nova-senha-bem-longa-SIMULADA');
  await page.getByRole('button', { name: 'Trocar senha' }).click();
  await expect(page.locator('img[src^="data:image/png;base64,"]')).toBeVisible();
  await check('cadastro do autenticador');

  await page.getByLabel('Código de seis dígitos').fill(STAFF.totp);
  await page.getByRole('button', { name: 'Ativar' }).click();
  await expect(page.getByTestId('code')).toHaveCount(10);
  await check('códigos de recuperação');
}

export async function walkSignedInScreens(
  page: Page,
  request: APIRequestContext,
  check: ScreenCheck,
) {
  await signInByApi(page, request, STAFF.semPermissoes);
  await page.goto('/usuarios');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Acesso negado');
  await check('acesso negado');
  await page.goto('/perfil');
  await page.getByLabel('Senha atual').fill('senha-errada-XQZ');
  await page.getByLabel('Nova senha', { exact: true }).fill('nova-senha-bem-longa-SIMULADA');
  await page.getByLabel('Confirme a nova senha').fill('nova-senha-bem-longa-SIMULADA');
  await page.getByRole('button', { name: 'Trocar senha' }).click();
  await expect(page.getByText('Senha atual incorreta.')).toBeVisible();
  await check('meu perfil com erro');
}
