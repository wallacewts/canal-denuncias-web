import { expect, test } from '../fixtures/privacy-guards';
import { MOCK_RECEIPT, useMockSession } from '../support/mock-api';
import { DESCRIPTION, expectStep, fillMinimalReport } from './new-report-helpers';

/**
 * Garantias do rascunho (US2 da feature 002): etapas não podem ser puladas, saída e recarga avisam, erro não apaga
 * nada e a inatividade descarta rascunho e comprovante. O armazenamento do navegador fica vazio o tempo todo.
 */
test.describe('rascunho sem rastro e sem perda por engano', () => {
  test.beforeEach(({ privacyGuards }) => {
    privacyGuards.trackSensitive(MOCK_RECEIPT.protocol);
    privacyGuards.trackSensitive(MOCK_RECEIPT.accessKey);
    privacyGuards.trackSensitive('CPFs');
  });

  test('endereço de etapa posterior volta para a primeira pendente', async ({ page, request }) => {
    await useMockSession(page, request);
    await page.goto('/nova-denuncia/revisao');
    await expectStep(page, 'Tipo de denunciante', 1);
    await expect(page).toHaveURL(/\/nova-denuncia\/tipo$/);

    await page.getByRole('radio', { name: 'Colaborador' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click();
    // Com o tipo preenchido, pular para o relato sem categoria volta para a categoria.
    await page.evaluate(() => history.pushState({}, '', '/nova-denuncia/relato'));
    await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));
    await expectStep(page, 'Categoria', 2);
  });

  test('etapas de anexos e identificação não existem nesta versão', async ({ page }) => {
    for (const path of ['/nova-denuncia/anexos', '/nova-denuncia/identificacao']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator('h1')).not.toHaveText(/Anexos|Identificação/);
    }
  });

  test('dados mantidos ao navegar e ao abrir o aviso de privacidade', async ({
    page,
    request,
    privacyGuards,
  }) => {
    await useMockSession(page, request);
    await fillMinimalReport(page);
    await page.getByRole('button', { name: 'Ler o aviso de privacidade' }).click();
    await page.getByRole('button', { name: 'Fechar' }).click();
    await page.getByRole('link', { name: 'Editar relato' }).click();
    await expect(page.getByLabel('Descrição')).toHaveValue(DESCRIPTION);
    await page.getByRole('link', { name: 'Voltar' }).click();
    await expect(page.getByRole('radio', { name: 'Vazamento de dados' })).toBeChecked();
    await privacyGuards.checkStorage();
  });

  for (const submit of ['invalid', 'error'] as const) {
    test(`envio com ${submit}: rascunho intacto e "Tentar de novo" funciona`, async ({
      page,
      request,
    }) => {
      const mock = await useMockSession(page, request, { submit });
      await fillMinimalReport(page);
      await page.getByRole('button', { name: 'Enviar denúncia' }).click();
      await expect(page.getByRole('alert')).toContainText('Não foi possível enviar');
      await expect(page.locator('h1')).toHaveText('Revisão');
      await expect(page.getByText('Planilha com CPFs')).toBeVisible();
      await page.getByRole('link', { name: 'Editar relato' }).click();
      await expect(page.getByLabel('Descrição')).toHaveValue(DESCRIPTION);
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByRole('button', { name: 'Continuar' }).click();
      // De volta à revisão (tela recriada), envia de novo, ainda com erro, e tenta de novo na mesma tela.
      await page.getByRole('button', { name: 'Enviar denúncia' }).click();
      await expect(page.getByRole('alert')).toContainText('Não foi possível enviar');
      await mock.setScenario({ submit: 'ok' });
      await page.getByRole('button', { name: 'Tentar de novo' }).click();
      await expect(page.locator('h1')).toHaveText('Protocolo gerado');
    });
  }

  test('recarregar ou abrir o protocolo direto mostra só o aviso', async ({ page, request }) => {
    await page.goto('/nova-denuncia/protocolo');
    await expect(page.getByText('O protocolo e a chave não podem mais ser exibidos')).toBeVisible();

    await useMockSession(page, request);
    await fillMinimalReport(page);
    await page.getByRole('button', { name: 'Enviar denúncia' }).click();
    await expect(page.getByTestId('access-key')).toBeVisible();
    page.once('dialog', (dialog) => void dialog.accept());
    await page.reload();
    await expect(page.getByText('O protocolo e a chave não podem mais ser exibidos')).toBeVisible();
    await expect(page.getByTestId('access-key')).toHaveCount(0);
  });

  test('fechar a aba com rascunho preenchido dispara o aviso do navegador', async ({
    page,
    request,
  }) => {
    await useMockSession(page, request);
    await page.goto('/nova-denuncia/tipo');
    await page.getByRole('radio', { name: 'Terceiro' }).check();
    const dialog = new Promise<string>((resolve) =>
      page.once('dialog', (d) => {
        resolve(d.type());
        void d.dismiss();
      }),
    );
    await page.close({ runBeforeUnload: true });
    expect(await dialog).toBe('beforeunload');
  });

  test('sair do fluxo pede confirmação: cancelar mantém, confirmar apaga', async ({
    page,
    request,
  }) => {
    await useMockSession(page, request);
    await page.goto('/nova-denuncia/tipo');
    await page.getByRole('radio', { name: 'Parceiro' }).check();

    await page.getByRole('link', { name: 'Ajuda' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('Descartar o rascunho?');
    await page.getByRole('button', { name: 'Continuar preenchendo' }).click();
    await expect(page).toHaveURL(/\/nova-denuncia\/tipo$/);
    await expect(page.getByRole('radio', { name: 'Parceiro' })).toBeChecked();

    await page.getByRole('link', { name: 'Ajuda' }).click();
    await page.getByRole('button', { name: 'Descartar' }).click();
    await expect(page).toHaveURL(/\/ajuda$/);
    await page.goBack();
    await expect(page.getByRole('radio', { name: 'Parceiro' })).not.toBeChecked();
  });

  test('voltar do navegador na tela do protocolo pede confirmação', async ({ page, request }) => {
    await useMockSession(page, request);
    await fillMinimalReport(page);
    await page.getByRole('button', { name: 'Enviar denúncia' }).click();
    await expect(page.getByTestId('access-key')).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('alertdialog')).toContainText('não poderão ser exibidos de novo');
    await page.getByRole('button', { name: 'Ficar' }).click();
    await expect(page.getByTestId('access-key')).toBeVisible();

    await page.goBack();
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByTestId('access-key')).toHaveCount(0);
  });

  test('inatividade: aviso aos 25 min, "Continuar" reinicia, descarte aos 30 min', async ({
    page,
    request,
  }) => {
    await useMockSession(page, request);
    await page.clock.install();
    await page.goto('/nova-denuncia/tipo');
    await page.getByRole('radio', { name: 'Colaborador' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click();

    await page.clock.runFor('25:00');
    await expect(page.getByRole('alertdialog')).toContainText('sem atividade há 25 minutos');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Continuar' }).click();

    // A contagem recomeçou quando o diálogo terminou de fechar: mais 25 minutos para o próximo aviso (com 2 s de margem
    // para a animação de fechamento) e o descarte 5 minutos depois.
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await page.clock.runFor('25:02');
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.clock.runFor('05:00');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/nova-denuncia\/tipo$/);
    await expect(page.locator('mat-snack-bar-container')).toContainText(
      'apagado depois de 30 minutos sem atividade',
    );
    await expect(page.getByRole('radio', { name: 'Colaborador' })).not.toBeChecked();
  });

  test('inatividade na tela do protocolo apaga protocolo e chave', async ({ page, request }) => {
    await useMockSession(page, request);
    await page.clock.install();
    await fillMinimalReport(page);
    await page.getByRole('button', { name: 'Enviar denúncia' }).click();
    await expect(page.getByTestId('access-key')).toBeVisible();
    await page.clock.runFor('30:00');
    await expect(page.getByTestId('access-key')).toHaveCount(0);
    await expect(page.getByText('O protocolo e a chave não podem mais ser exibidos')).toBeVisible();
  });
});
