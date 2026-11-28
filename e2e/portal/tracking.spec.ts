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
