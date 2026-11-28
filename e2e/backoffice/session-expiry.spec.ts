import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from '../fixtures/privacy-guards';
import { STAFF } from '../support/mock-api';
import { signInByApi } from './auth-helpers';

/**
 * BAUTH-06 contra o simulador (feature 004, US4). O relógio do navegador (Playwright) e o do simulador andam juntos:
 * os avisos seguem os horários informados pela API, nunca um prazo escrito no front.
 */

const MIN = 60_000;
const IDLE_WARNING = 'Sua sessão vai terminar em 1 minuto por falta de uso.';
const ABSOLUTE_WARNING =
  'Sua sessão vai terminar em 1 minuto (limite de 8 horas). Salve o que estiver fazendo.';

async function signedInAtPanel(page: Page, request: APIRequestContext) {
  await page.clock.install();
  const mock = await signInByApi(page, request);
  await page.goto('/painel');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Painel');
  const advance = async (ms: number) => {
    await mock.advanceClock(ms);
    await page.clock.fastForward(ms);
  };
  return { mock, advance };
}

const banner = (page: Page) =>
  page.getByRole('alert').filter({ hasText: 'Sua sessão vai terminar' });
const menu = (page: Page) => page.getByRole('navigation', { name: 'Menu' });

/** Navegação interna antes do encerramento: o "voltar" depois cai numa tela do mesmo documento. */
async function openProfileFromMenu(page: Page) {
  await menu(page).getByRole('link', { name: 'Meu perfil' }).click();
  await expect(page).toHaveURL(/\/perfil$/);
}

async function expectLoginWith(page: Page, message: string) {
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrar');
  await expect(page.getByTestId('end-reason')).toHaveText(message);
  // Nenhuma tela interna (menu, denúncias) fica visível depois do encerramento.
  await expect(menu(page)).toHaveCount(0);
}

async function expectBackStaysOut(page: Page) {
  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrar');
  await expect(menu(page)).toHaveCount(0);
}

test('aviso de inatividade e "Continuar" com uma única chamada ao /me', async ({
  page,
  request,
}) => {
  const { advance } = await signedInAtPanel(page, request);
  await advance(12 * MIN);
  await expect(banner(page)).toHaveCount(0);
  await advance(MIN + 5_000);
  await expect(banner(page)).toContainText(IDLE_WARNING);
  await expect(banner(page).getByRole('button')).toHaveText(['Continuar', 'Sair']);

  const meCalls: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'GET' && new URL(r.url()).pathname === '/api/admin/v1/me')
      meCalls.push(r.url());
  });
  await banner(page).getByRole('button', { name: 'Continuar' }).click();
  await expect(banner(page)).toHaveCount(0);
  expect(meCalls).toHaveLength(1);
  // A janela recomeça a partir do "Continuar".
  await advance(12 * MIN);
  await expect(banner(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Painel');
});

test('expiração por inatividade encerra e "voltar" não mostra nada', async ({ page, request }) => {
  const { advance, mock } = await signedInAtPanel(page, request);
  await openProfileFromMenu(page);
  await advance(14 * MIN + 5_000);
  await expectLoginWith(
    page,
    'Sua sessão terminou por falta de uso. Entre de novo para continuar.',
  );
  // O front encerrou antes da API (margem de 60 s) e pediu a saída: a sessão também acabou no servidor.
  await expect.poll(async () => (await mock.authStats()).sessions).toBe(0);
  await expectBackStaysOut(page);
});

test('limite de 8 horas: aviso só com "Sair" e encerramento no horário da API', async ({
  page,
  request,
}) => {
  // 36 ciclos de aviso e "Continuar": mais lento que os outros testes.
  test.setTimeout(120_000);
  const { advance } = await signedInAtPanel(page, request);
  const step = 13 * MIN + 5_000;
  // Uso contínuo: a cada aviso de inatividade, "Continuar". 36 passos levam a 7 h 51 min.
  for (let i = 0; i < 36; i++) {
    await advance(step);
    await banner(page).getByRole('button', { name: 'Continuar' }).click();
    await expect(banner(page)).toHaveCount(0);
  }
  await advance(8 * 60 * MIN - 36 * step - MIN + 5_000);
  await expect(banner(page)).toContainText(ABSOLUTE_WARNING);
  await expect(banner(page).getByRole('button')).toHaveText(['Sair']);
  await advance(MIN);
  await expectLoginWith(
    page,
    'Sua sessão atingiu o limite de 8 horas. Entre de novo para continuar.',
  );
});

test('401 da API (sessão revogada) encerra com a mensagem de sessão terminada', async ({
  page,
  request,
}) => {
  const { advance, mock } = await signedInAtPanel(page, request);
  await openProfileFromMenu(page);
  await advance(13 * MIN + 5_000);
  await mock.revokeStaffSessions();
  await banner(page).getByRole('button', { name: 'Continuar' }).click();
  await expectLoginWith(page, 'Sua sessão terminou. Entre de novo para continuar.');
  await expectBackStaysOut(page);
});

test('"Sair" encerra no servidor e no front; "voltar" não mostra nada', async ({
  page,
  request,
}) => {
  const mock = await signInByApi(page, request);
  await page.goto('/painel');
  await openProfileFromMenu(page);
  await page.locator('mat-toolbar').getByRole('button', { name: 'Sair' }).click();
  await expectLoginWith(page, 'Você saiu do backoffice.');
  expect((await mock.authStats()).sessions).toBe(0);
  await expectBackStaysOut(page);
});

test('"Sair" com a chamada falhando ainda limpa a sessão no front', async ({ page, request }) => {
  await signInByApi(page, request);
  await page.goto('/painel');
  await page.route('**/api/admin/v1/auth/sign-out', (route) => route.abort('failed'));
  await page.locator('mat-toolbar').getByRole('button', { name: 'Sair' }).click();
  await expectLoginWith(page, 'Você saiu do backoffice.');
});

test('duas abas: uso numa evita o aviso na outra; sair numa encerra a outra', async ({
  page,
  request,
  context,
}) => {
  await context.clock.install();
  const mock = await signInByApi(page, request, STAFF.pronta);
  await page.goto('/painel');
  const other = await context.newPage();
  await other.setExtraHTTPHeaders({ 'x-mock-session': mock.session });
  await other.goto('/painel');
  await expect(other.getByRole('heading', { level: 1 })).toHaveText('Painel');

  await mock.advanceClock(13 * MIN + 5_000);
  await context.clock.fastForward(13 * MIN + 5_000);
  await expect(banner(page)).toBeVisible();
  await expect(banner(other)).toBeVisible();
  await banner(page).getByRole('button', { name: 'Continuar' }).click();
  await expect(banner(page)).toHaveCount(0);
  await expect(banner(other)).toHaveCount(0);

  await page.locator('mat-toolbar').getByRole('button', { name: 'Sair' }).click();
  await expectLoginWith(page, 'Você saiu do backoffice.');
  await expectLoginWith(other, 'Você saiu do backoffice em outra aba.');
  await other.close();
});

test('resposta que chega depois do encerramento é descartada', async ({ page, request }) => {
  const { advance } = await signedInAtPanel(page, request);
  await openProfileFromMenu(page);
  await advance(13 * MIN + 5_000);

  // O /me do "Continuar" chega ao servidor (200) mas a resposta só é entregue depois do "Sair".
  let release = () => undefined as void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let answered = () => undefined as void;
  const reachedServer = new Promise<void>((resolve) => (answered = resolve));
  let held = true;
  await page.route('**/api/admin/v1/me', async (route) => {
    if (!held) return route.continue();
    held = false;
    const response = await route.fetch();
    answered();
    await gate;
    await route.fulfill({ response });
  });
  await banner(page).getByRole('button', { name: 'Continuar' }).click();
  await reachedServer;
  await banner(page).getByRole('button', { name: 'Sair' }).click();
  await expectLoginWith(page, 'Você saiu do backoffice.');
  const late = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/admin/v1/me');
  release();
  expect((await late).status()).toBe(200);

  // Se a resposta atrasada tivesse reaberto a sessão, "voltar" mostraria a tela interna sem passar pela API.
  await expect(page.getByTestId('end-reason')).toHaveText('Você saiu do backoffice.');
  await expectBackStaysOut(page);
});

test('o cabeçalho Date que chega ao front é o da API (base da correção de relógio)', async ({
  page,
  request,
}) => {
  const mock = await signInByApi(page, request);
  await mock.advanceClock(60 * MIN);
  const response = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/admin/v1/me');
  await page.goto('/painel');
  const date = Date.parse((await (await response).allHeaders())['date'] ?? '');
  // O simulador está 1 hora à frente; o Date do nginx seria o horário real.
  expect(date - Date.now()).toBeGreaterThan(55 * MIN);
});
