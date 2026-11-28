import { expect, test } from '../fixtures/privacy-guards';
import { STAFF, useMockSession } from '../support/mock-api';
import { signInByApi } from './auth-helpers';
import { BACKOFFICE_ROUTES } from './routes';
import { reloadWhenSettled } from '../support/reload';

/** BAUTH-05 contra o simulador (feature 004, US3). */

test('sem sessão, nenhuma tela interna abre: todas vão ao login', async ({ page, request }) => {
  await useMockSession(page, request);
  for (const route of BACKOFFICE_ROUTES.filter((r) => r !== '/login')) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrar');
  }
});

test('depois de entrar, volta para a tela que tentou abrir', async ({ page, request }) => {
  await useMockSession(page, request);
  await page.goto('/usuarios');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('E-mail').fill(STAFF.pronta);
  await page.getByLabel('Senha').fill(STAFF.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByLabel('Código de seis dígitos').fill(STAFF.totp);
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page).toHaveURL(/\/usuarios$/);
});

test('menu só com o que as permissões da API permitem', async ({ page, request }) => {
  await signInByApi(page, request, STAFF.semPermissoes);
  await page.goto('/painel');
  await expect(page.getByRole('navigation', { name: 'Menu' }).getByRole('link')).toHaveText([
    'Painel',
    'Meu perfil',
  ]);
});

test('tela sem permissão aberta pelo endereço mostra acesso negado, sem a tela pedida', async ({
  page,
  request,
}) => {
  await signInByApi(page, request, STAFF.semPermissoes);
  await page.goto('/usuarios');
  await expect(page).toHaveURL(/\/acesso-negado$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Acesso negado');
});

test('recarregar uma tela interna restaura a sessão pelo /me', async ({ page, request }) => {
  await signInByApi(page, request);
  await page.goto('/denuncias');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Caixa de denúncias');
  await reloadWhenSettled(page);
  await expect(page).toHaveURL(/\/denuncias$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Caixa de denúncias');
});
