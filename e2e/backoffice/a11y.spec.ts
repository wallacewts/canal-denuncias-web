import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/privacy-guards';
import { STAFF, useMockSession } from '../support/mock-api';
import { signInByApi } from './auth-helpers';
import { BACKOFFICE_ROUTES } from './routes';
import { walkFirstAccessScreens, walkSignedInScreens, walkSignInScreens } from './screens';

/**
 * Acessibilidade do backoffice (FR-028, WCAG 2.1 AA), com as guardas de privacidade e de CSP ativas (sem bypassCSP).
 * Firefox: ver docs/validacoes/acesso-equipe.md (queda de página do Firefox durante o axe, rara e fora do app).
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoBlocking(page: Page, where: string) {
  // Animações de entrada (Material) mudam o contraste medido no meio do caminho.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running'),
  );
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const blocking = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${where} · ${v.id}: ${v.help} (${v.nodes.length})`);
  expect(blocking).toEqual([]);
}

for (const route of BACKOFFICE_ROUTES) {
  test(`backoffice ${route}: sem violação séria ou crítica`, async ({ page, request }) => {
    if (route === '/login') await useMockSession(page, request);
    else await signInByApi(page, request);
    await page.goto(route);
    await expect(page.locator('h1').first()).toBeVisible();
    await expectNoBlocking(page, route);
  });
}

test('entrada: login com erro e desafio (erro no campo e código de recuperação)', async ({
  page,
  request,
}) => {
  await walkSignInScreens(page, request, (screen) => expectNoBlocking(page, screen));
});

test('primeiro acesso: troca de senha com erro, cadastro do autenticador e códigos', async ({
  page,
  request,
}) => {
  await walkFirstAccessScreens(page, request, (screen) => expectNoBlocking(page, screen));
});

test('acesso negado e meu perfil com erro no campo', async ({ page, request }) => {
  await walkSignedInScreens(page, request, (screen) => expectNoBlocking(page, screen));
});

test('aviso de expiração por inatividade', async ({ page, request }) => {
  await page.clock.install();
  const mock = await signInByApi(page, request);
  await page.goto('/painel');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Painel');
  await mock.advanceClock(13 * 60_000 + 5_000);
  await page.clock.fastForward(13 * 60_000 + 5_000);
  await expect(
    page.getByRole('alert').filter({ hasText: 'Sua sessão vai terminar' }),
  ).toBeVisible();
  await expectNoBlocking(page, 'aviso de inatividade');
});

/** Percursos só com teclado: Tab para chegar ao campo, digitação e Enter para enviar. */
async function tabTo(page: Page, name: RegExp) {
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return '';
      const labelled = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : '';
      return `${labelled ?? ''} ${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`;
    });
    if (name.test(label)) return;
  }
  throw new Error(`não chegou com Tab em ${name}`);
}

test('entrada só com teclado: e-mail, senha, código e painel', async ({ page, request }) => {
  await useMockSession(page, request);
  await page.goto('/login');
  await expect(page.locator('h1')).toHaveText('Entrar');
  await tabTo(page, /E-mail/);
  await page.keyboard.type(STAFF.pronta);
  await tabTo(page, /Senha/);
  await page.keyboard.type(STAFF.password);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/login\/codigo$/);
  // Cada etapa leva o foco ao título ao abrir: Tab antes disso perderia o foco.
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await tabTo(page, /Código de seis dígitos/);
  await page.keyboard.type(STAFF.totp);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/painel$/);
});

test('primeiro acesso só com teclado: senha, autenticador, códigos e painel', async ({
  page,
  request,
}) => {
  await useMockSession(page, request);
  await page.goto('/login');
  await expect(page.locator('h1')).toHaveText('Entrar');
  await tabTo(page, /E-mail/);
  await page.keyboard.type(STAFF.primeiroAcesso);
  await tabTo(page, /Senha/);
  await page.keyboard.type(STAFF.provisionalPassword);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/primeiro-acesso\/senha$/);
  // Cada etapa leva o foco ao título ao abrir: Tab antes disso perderia o foco.
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await tabTo(page, /Senha atual/);
  await page.keyboard.type(STAFF.provisionalPassword);
  await tabTo(page, /^\s*Nova senha/);
  await page.keyboard.type('nova-senha-bem-longa-SIMULADA');
  await tabTo(page, /Confirme a nova senha/);
  await page.keyboard.type('nova-senha-bem-longa-SIMULADA');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/primeiro-acesso\/autenticador$/);
  // Cada etapa leva o foco ao título ao abrir: Tab antes disso perderia o foco.
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await tabTo(page, /Código de seis dígitos/);
  await page.keyboard.type(STAFF.totp);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/primeiro-acesso\/codigos$/);
  // Cada etapa leva o foco ao título ao abrir: Tab antes disso perderia o foco.
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await tabTo(page, /Guardei os códigos/);
  await page.keyboard.press('Space');
  await expect(page.getByLabel('Guardei os códigos de recuperação')).toBeChecked();
  await tabTo(page, /Continuar/);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/painel$/);
});
