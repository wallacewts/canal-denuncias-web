import { expect, test } from '../fixtures/privacy-guards';
import { MOCK_RECEIPT } from '../support/mock-api';
import { openTracking } from './tracking-helpers';

/** Acompanhamento (feature 003) contra o simulador, com as guardas de privacidade ativas. */
test.describe('andamento e desfecho', () => {
  test.beforeEach(({ privacyGuards }) => {
    privacyGuards.trackSensitive(MOCK_RECEIPT.protocol);
    privacyGuards.trackSensitive(MOCK_RECEIPT.accessKey);
    privacyGuards.trackSensitive('SIMULADA.');
  });

  const cases = [
    ['received', 'Recebida', null],
    ['in-review', 'Em análise', null],
    ['awaiting', 'Aguardando sua resposta', null],
    ['closed', 'Encerrada', null],
    ['concluded-substantiated', 'Concluída', 'Procedente'],
    ['concluded-partial', 'Concluída', 'Parcialmente procedente'],
    ['concluded-unsubstantiated', 'Concluída', 'Improcedente'],
  ] as const;

  for (const [report, label, outcome] of cases) {
    test(`${report}: rótulo "${label}"${outcome ? ` e desfecho "${outcome}"` : ''}`, async ({
      page,
      request,
    }) => {
      await openTracking(page, request, { report });
      await expect(page.getByTestId('status')).toHaveText(label);
      if (outcome) await expect(page.getByTestId('outcome')).toHaveText(outcome);
      else await expect(page.getByTestId('outcome')).toHaveCount(0);
      await expect(page.getByTestId('category')).toContainText('Vazamento de dados');
      await expect(page.getByTestId('received-on')).toHaveText(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  }

  test('aguardando: prazo em destaque, com o atalho para responder', async ({ page, request }) => {
    await openTracking(page, request, { report: 'awaiting' });
    await expect(page.getByTestId('reply-deadline')).toHaveText(
      /^Responda até \d{2}\/\d{2}\/\d{4}$/,
    );
    await expect(page.getByRole('button', { name: 'Responder agora' })).toBeVisible();
  });

  // Teste separado (sem navegar no meio): no Firefox, sair da página com chunks ainda baixando falha o SRI.
  test('aguardando com prazo vencido: aparece como vencido', async ({ page, request }) => {
    await openTracking(page, request, { report: 'awaiting-overdue' });
    await expect(page.getByTestId('reply-deadline')).toHaveText(
      /^Prazo vencido em \d{2}\/\d{2}\/\d{4}$/,
    );
  });

  test('a linha do tempo mostra só datas e status públicos, sem hora e sem relato', async ({
    page,
    request,
  }) => {
    await openTracking(page, request, { report: 'in-review' });
    const items = page.getByTestId('timeline').getByRole('listitem');
    await expect(items).toHaveCount(2);
    for (const text of await items.allTextContents()) {
      expect(text).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(text).not.toMatch(/\d{2}:\d{2}/);
    }
    await expect(page.getByText('Planilha com CPFs')).toHaveCount(0);
  });
});

test.describe('mensagens com a equipe', () => {
  test.beforeEach(({ privacyGuards }) => {
    privacyGuards.trackSensitive(MOCK_RECEIPT.protocol);
    privacyGuards.trackSensitive(MOCK_RECEIPT.accessKey);
    privacyGuards.trackSensitive('SIMULADA.');
    privacyGuards.trackSensitive('Resposta curta XQZ');
  });

  const list = (page: import('@playwright/test').Page) =>
    page.getByTestId('messages').getByRole('listitem');

  test('lista em ordem, autores sem nome e datas sem hora', async ({ page, request }) => {
    await openTracking(page, request);
    await expect(list(page)).toHaveCount(3);
    const texts = await list(page).allTextContents();
    expect(texts[0]).toContain('Equipe de apuração');
    expect(texts[1]).toContain('Você');
    for (const text of texts) {
      expect(text).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(text).not.toMatch(/\d{2}:\d{2}/);
    }
  });

  test('envio com 1 e com 5.000 caracteres; 5.001 bloqueado com erro ligado ao campo', async ({
    page,
    request,
  }) => {
    await openTracking(page, request);
    const field = page.getByLabel('Sua mensagem');
    const send = page.getByRole('button', { name: 'Enviar mensagem' });
    await field.fill('X');
    await send.click();
    await expect(list(page)).toHaveCount(4);
    await expect(field).toHaveValue('');
    await field.fill('x'.repeat(5_001));
    await expect(send).toBeDisabled();
    await expect(page.getByText('Use no máximo 5.000 caracteres.')).toBeVisible();
    const describedBy = await field.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await field.fill('x'.repeat(5_000));
    await expect(page.getByText('Restam 0 caracteres')).toBeVisible();
    await send.click();
    await expect(list(page)).toHaveCount(5);
  });

  test('clique duplo em Enviar faz um só envio, e o texto fica no campo se falhar', async ({
    page,
    request,
  }) => {
    const mock = await openTracking(page, request, { send: 'slow' });
    const field = page.getByLabel('Sua mensagem');
    await field.fill('Resposta curta XQZ');
    await page.getByRole('button', { name: 'Enviar mensagem' }).dblclick();
    await expect(list(page)).toHaveCount(4);
    expect((await mock.stats()).messages).toBe(1);
    await mock.setScenario({ send: 'error' });
    await field.fill('Resposta curta XQZ');
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();
    await expect(page.locator('mat-snack-bar-container')).toBeVisible();
    await expect(field).toHaveValue('Resposta curta XQZ');
  });

  test('responder quando aguardava: status volta para Em análise; "Responder agora" leva ao campo', async ({
    page,
    request,
  }) => {
    await openTracking(page, request, { report: 'awaiting' });
    await page.getByRole('button', { name: 'Responder agora' }).click();
    await expect(page.getByLabel('Sua mensagem')).toBeFocused();
    await page.getByLabel('Sua mensagem').fill('X');
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();
    await expect(page.getByTestId('status')).toHaveText('Em análise');
    await expect(page.getByTestId('reply-deadline')).toHaveCount(0);
  });

  test('"Atualizar" traz a mensagem nova e anuncia; nada é buscado sem o clique', async ({
    page,
    request,
  }) => {
    await page.clock.install();
    const mock = await openTracking(page, request);
    await page.clock.runFor(5 * 60_000);
    expect((await mock.stats()).messageReads).toBe(1);
    await mock.newTeamMessage();
    await page.getByRole('button', { name: 'Atualizar' }).click();
    await expect(list(page)).toHaveCount(4);
    await expect(page.getByTestId('messages-live')).toHaveText('1 mensagem nova');
    await page.getByRole('button', { name: 'Atualizar' }).click();
    await expect(page.getByTestId('messages-live')).toHaveText('Nenhuma mensagem nova');
  });

  test('denúncia encerrada pelo envio (409): campo some e a explicação aparece', async ({
    page,
    request,
  }) => {
    await openTracking(page, request, { send: 'closed' });
    await page.getByLabel('Sua mensagem').fill('X');
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();
    await expect(page.getByTestId('closed-note')).toBeVisible();
    await expect(page.getByLabel('Sua mensagem')).toHaveCount(0);
    await expect(page.getByTestId('status')).toHaveText('Encerrada');
    await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);
  });

  for (const report of ['closed', 'concluded-substantiated'] as const) {
    test(`${report}: mensagens visíveis, sem campo de resposta`, async ({ page, request }) => {
      await openTracking(page, request, { report });
      await expect(list(page)).toHaveCount(3);
      await expect(page.getByTestId('closed-note')).toBeVisible();
      await expect(page.getByLabel('Sua mensagem')).toHaveCount(0);
    });
  }

  test('lista vazia: orientação para a primeira mensagem', async ({ page, request }) => {
    await openTracking(page, request, { messages: 'empty' });
    await expect(page.getByText('Ainda não há mensagens.')).toBeVisible();
    await expect(
      page.getByText('Use o campo abaixo para escrever à equipe de apuração.'),
    ).toBeVisible();
  });
});
