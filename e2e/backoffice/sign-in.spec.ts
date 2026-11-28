import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/privacy-guards';
import { STAFF, useMockSession } from '../support/mock-api';
import { reloadWhenSettled } from '../support/reload';

/** BAUTH-01 e BAUTH-02 contra o simulador (feature 004, US1). As guardas de privacidade valem em todos os testes. */

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test('entrada completa: senha, código do autenticador e painel', async ({ page, request }) => {
  await useMockSession(page, request);
  await signIn(page, STAFF.pronta, STAFF.password);
  await expect(page).toHaveURL(/\/login\/codigo$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Código de verificação');
  await page.getByLabel('Código de seis dígitos').fill(STAFF.totp);
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Painel');
});

test('etapa da senha: a mesma mensagem e o mesmo estado para as cinco falhas', async ({
  page,
  request,
}) => {
  const cases: { email: string; password: string; rateLimited?: boolean }[] = [
    { email: 'ninguem.SIMULADA@canal.test', password: STAFF.password },
    { email: STAFF.pronta, password: 'XQZ' },
    { email: STAFF.bloqueada, password: STAFF.password },
    { email: STAFF.desativada, password: STAFF.password },
    { email: STAFF.pronta, password: STAFF.password, rateLimited: true },
  ];
  const observed: string[] = [];
  for (const c of cases) {
    await useMockSession(page, request, c.rateLimited ? { signIn: 'rate-limited' } : {});
    await signIn(page, c.email, c.password);
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    observed.push(
      JSON.stringify({
        url: new URL(page.url()).pathname,
        alert: await alert.textContent(),
        password: await page.getByLabel('Senha').inputValue(),
        alerts: await page.getByRole('alert').count(),
      }),
    );
  }
  expect(new Set(observed).size).toBe(1);
  expect(observed[0]).toContain('E-mail ou senha inválidos.');
  expect(observed[0]).toContain('"password":""');
  expect(observed[0]).toContain('"url":"/login"');
});

test('código de recuperação também dá acesso', async ({ page, request }) => {
  await useMockSession(page, request);
  await signIn(page, STAFF.pronta, STAFF.password);
  await page.getByRole('button', { name: 'Usar um código de recuperação' }).click();
  await page.getByLabel('Código de recuperação').fill(STAFF.recoveryCode);
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page).toHaveURL(/\/painel$/);
});

test('código errado e bloqueio temporário do desafio têm mensagens próprias', async ({
  page,
  request,
}) => {
  const mock = await useMockSession(page, request);
  await signIn(page, STAFF.pronta, STAFF.password);
  await page.getByLabel('Código de seis dígitos').fill('000000');
  await page.getByRole('button', { name: 'Verificar' }).click();
  // 422 MFA_CODE_INVALID: erro no campo, a sessão pendente continua (o código certo ainda entra).
  await expect(page.getByText('Código inválido. Confira e tente de novo.')).toBeVisible();
  await expect(page.getByLabel('Código de seis dígitos')).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL(/\/login\/codigo$/);
  await mock.setScenario({ challenge: 'locked' });
  await page.getByLabel('Código de seis dígitos').fill(STAFF.totp);
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Muitas tentativas. Aguarde alguns minutos e entre de novo.',
  );
  await expect(page).toHaveURL(/\/login\/codigo$/);
  // 429 (limite de tentativas): a mensagem genérica de excesso de tentativas, sem encerrar a sessão pendente.
  await mock.setScenario({ challenge: 'rate-limited' });
  await page.getByLabel('Código de seis dígitos').fill(STAFF.totp);
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page.locator('mat-snack-bar-container')).toContainText(
    'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.',
  );
  await expect(page).toHaveURL(/\/login\/codigo$/);
});

test('o desafio não abre pelo endereço sem passar pela senha', async ({ page, request }) => {
  await useMockSession(page, request);
  await page.goto('/login/codigo');
  await expect(page).toHaveURL(/\/login$/);
});

test('quem já tem autenticador e precisa trocar a senha: código primeiro, depois a troca', async ({
  page,
  request,
}) => {
  await useMockSession(page, request);
  await signIn(page, STAFF.trocaComAutenticador, STAFF.provisionalPassword);
  await expect(page).toHaveURL(/\/login\/codigo$/);
  await page.getByLabel('Código de seis dígitos').fill(STAFF.totp);
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page).toHaveURL(/\/primeiro-acesso\/senha$/);
  // Recarregar ou abrir uma tela interna não pula a troca: o /me devolve passwordChangeRequired e as demais rotas
  // respondem 403 PASSWORD_CHANGE_REQUIRED.
  await reloadWhenSettled(page);
  await expect(page).toHaveURL(/\/primeiro-acesso\/senha$/);
  await page.goto('/denuncias');
  await expect(page).toHaveURL(/\/primeiro-acesso\/senha$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trocar senha');
  await page.getByLabel('Senha atual').fill(STAFF.provisionalPassword);
  await page.getByLabel('Nova senha', { exact: true }).fill('nova-senha-bem-longa-SIMULADA');
  await page.getByLabel('Confirme a nova senha').fill('nova-senha-bem-longa-SIMULADA');
  await page.getByRole('button', { name: 'Trocar senha' }).click();
  // Volta para a tela que tentou abrir antes da troca.
  await expect(page).toHaveURL(/\/denuncias$/);
});
