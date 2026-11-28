import { expect, test } from '../fixtures/privacy-guards';
import { MOCK_RECEIPT, useMockSession } from '../support/mock-api';
import { openTracking } from './tracking-helpers';

/** Acesso só em memória (feature 003): recarga, rota direta e URL colada nunca mostram a denúncia. */
test.describe('acesso do denunciante', () => {
  test.beforeEach(({ privacyGuards }) => {
    privacyGuards.trackSensitive(MOCK_RECEIPT.protocol);
    privacyGuards.trackSensitive(MOCK_RECEIPT.accessKey);
    privacyGuards.trackSensitive('SIMULADA.');
  });

  test('recarregar o acompanhamento encerra o acesso e volta para a consulta', async ({
    page,
    request,
  }) => {
    await openTracking(page, request);
    await page.reload();
    await expect(page).toHaveURL(/\/consultar$/);
    await expect(page.getByTestId('status')).toHaveCount(0);
  });

  test('abrir /acompanhamento direto, sem acesso, leva para a consulta', async ({
    page,
    request,
  }) => {
    await useMockSession(page, request);
    await page.goto('/acompanhamento');
    await expect(page).toHaveURL(/\/consultar$/);
    await expect(page.locator('h1')).toHaveText('Consultar denúncia');
  });

  test('dados colados na URL são ignorados', async ({ page, request }) => {
    await useMockSession(page, request);
    await page.goto('/acompanhamento?protocolo=DV-TESTE-COLADO');
    await expect(page).toHaveURL(/\/consultar$/);
    await expect(page.getByLabel('Protocolo', { exact: true })).toHaveValue('');
  });
});

test.describe('aviso de expiração', () => {
  test.beforeEach(({ privacyGuards }) => {
    privacyGuards.trackSensitive(MOCK_RECEIPT.protocol);
    privacyGuards.trackSensitive(MOCK_RECEIPT.accessKey);
    privacyGuards.trackSensitive('SIMULADA.');
  });

  test('aos 13 minutos aparece a faixa, sem tirar o foco do campo', async ({ page, request }) => {
    await page.clock.install();
    await openTracking(page, request);
    const field = page.getByLabel('Sua mensagem');
    await field.click();
    await field.fill('texto em digitação');
    await page.clock.runFor(13 * 60_000 - 5_000);
    await expect(page.getByTestId('expiry-banner')).toHaveCount(0);
    await page.clock.runFor(5_000);
    const banner = page.getByTestId('expiry-banner');
    await expect(banner).toHaveAttribute('role', 'alert');
    await expect(banner).toHaveText(
      'Seu acesso termina em 2 minutos. O texto que você ainda não enviou será perdido.',
    );
    await expect(field).toBeFocused();
  });
});

test.describe('saída segura', () => {
  test.beforeEach(({ privacyGuards }) => {
    privacyGuards.trackSensitive(MOCK_RECEIPT.protocol);
    privacyGuards.trackSensitive(MOCK_RECEIPT.accessKey);
    privacyGuards.trackSensitive('SIMULADA.');
    privacyGuards.trackSensitive('texto em digitação XQZ');
  });

  const ended = 'Seu acesso terminou. Informe o protocolo e a chave de novo.';

  test('"Sair" no topo e no fim; sair apaga tudo e o voltar do navegador não mostra a denúncia', async ({
    page,
    request,
  }) => {
    await openTracking(page, request);
    const exits = page.getByRole('button', { name: 'Sair', exact: true });
    await expect(exits).toHaveCount(2);
    await exits.first().click();
    await expect(page).toHaveURL(/\/consultar$/);
    await expect(page.getByTestId('end-reason')).toHaveText('Você saiu do acompanhamento.');
    await page.goBack();
    await expect(page).toHaveURL(/\/consultar$/);
    await expect(page.getByTestId('status')).toHaveCount(0);
    await expect(page.getByTestId('messages')).toHaveCount(0);
  });

  test('aos 15 minutos o acesso termina, o texto em digitação some e aparece uma única mensagem', async ({
    page,
    request,
  }) => {
    await page.clock.install();
    await openTracking(page, request);
    await page.getByLabel('Sua mensagem').fill('texto em digitação XQZ');
    await page.clock.runFor(15 * 60_000);
    await expect(page).toHaveURL(/\/consultar$/);
    await expect(page.getByTestId('end-reason')).toHaveText(ended);
    await expect(page.getByText(ended)).toHaveCount(1);
    await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);
    await expect(page.getByLabel('Sua mensagem')).toHaveCount(0);
  });

  test('401 da API encerra com a mesma mensagem, sem a mensagem padrão', async ({
    page,
    request,
  }) => {
    const mock = await openTracking(page, request);
    // Espera o carregamento inicial terminar antes de trocar o cenário (senão o próprio carregamento recebe o 401).
    await expect(page.getByTestId('messages')).toBeVisible();
    await mock.setScenario({ me: 'unauthorized' });
    await page.getByRole('button', { name: 'Atualizar' }).click();
    await expect(page).toHaveURL(/\/consultar$/);
    await expect(page.getByTestId('end-reason')).toHaveText(ended);
    await expect(page.getByText(ended)).toHaveCount(1);
    await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);
  });

  test('envio lento com o acesso expirando no meio: a resposta é descartada e nada volta à tela', async ({
    page,
    request,
  }) => {
    await page.clock.install();
    await openTracking(page, request, { send: 'slow' });
    await page.getByLabel('Sua mensagem').fill('texto em digitação XQZ');
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();
    await page.clock.runFor(15 * 60_000);
    await expect(page).toHaveURL(/\/consultar$/);
    // A resposta do simulador chega 2 s depois (tempo real); a tela continua na consulta, sem dados.
    await page.waitForTimeout(2_500);
    await expect(page).toHaveURL(/\/consultar$/);
    await expect(page.getByTestId('messages')).toHaveCount(0);
    await expect(page.getByTestId('status')).toHaveCount(0);
  });

  test('orientações para computador compartilhado nas duas telas', async ({ page, request }) => {
    await useMockSession(page, request);
    await page.goto('/consultar');
    await expect(page.getByText('Não salve a chave no navegador.')).toBeVisible();
    await openTracking(page, request);
    await expect(page.getByText('Não salve a chave no navegador.')).toBeVisible();
    await expect(page.getByText('feche a aba')).toBeVisible();
  });

  test('duas abas têm acessos independentes: sair numa não afeta a outra', async ({
    page,
    request,
    context,
  }) => {
    await openTracking(page, request);
    const other = await context.newPage();
    await openTracking(other, request);
    await page.getByRole('button', { name: 'Sair', exact: true }).first().click();
    await expect(page).toHaveURL(/\/consultar$/);
    await expect(other.getByTestId('status')).toBeVisible();
    await other.close();
  });
});

test.describe('teclado', () => {
  test.beforeEach(({ privacyGuards }) => {
    privacyGuards.trackSensitive(MOCK_RECEIPT.protocol);
    privacyGuards.trackSensitive(MOCK_RECEIPT.accessKey);
    privacyGuards.trackSensitive('SIMULADA.');
  });

  /** Aperta Tab até o elemento ficar com o foco (sem usar o mouse). */
  async function tabTo(
    page: import('@playwright/test').Page,
    target: import('@playwright/test').Locator,
  ) {
    for (let i = 0; i < 40; i++) {
      if (await target.evaluate((el) => el === document.activeElement)) return;
      await page.keyboard.press('Tab');
    }
    throw new Error('o elemento não recebeu o foco pelo teclado');
  }

  test('consultar, responder e sair só com o teclado', async ({ page, request }) => {
    const mock = await useMockSession(page, request);
    await page.goto('/consultar');
    await tabTo(page, page.getByLabel('Protocolo', { exact: true }));
    await page.keyboard.type(MOCK_RECEIPT.protocol);
    await tabTo(page, page.getByLabel('Chave de acesso', { exact: true }));
    await page.keyboard.type(MOCK_RECEIPT.accessKey);
    await page.keyboard.press('Enter');
    await expect(page.locator('h1')).toHaveText('Acompanhamento da denúncia');
    await tabTo(page, page.getByLabel('Sua mensagem'));
    await page.keyboard.type('Resposta pelo teclado');
    await tabTo(page, page.getByRole('button', { name: 'Enviar mensagem' }));
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('messages').getByRole('listitem')).toHaveCount(4);
    expect((await mock.stats()).messages).toBe(1);
    await tabTo(page, page.getByRole('button', { name: 'Sair', exact: true }).last());
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('end-reason')).toHaveText('Você saiu do acompanhamento.');
  });
});
