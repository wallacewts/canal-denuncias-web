import { readFileSync } from 'node:fs';
import { expect, test } from '../fixtures/privacy-guards';
import { MOCK_RECEIPT, useMockSession } from '../support/mock-api';
import { DESCRIPTION, expectStep, fillMinimalReport } from './new-report-helpers';

/**
 * Envio de denúncia (US1 da feature 002) contra o servidor simulado, no build de produção com nginx e CSP.
 * As guardas de privacidade estão ativas em todo teste: protocolo, chave e relato nunca na URL, no armazenamento
 * ou no console.
 */
test.describe('envio de denúncia', () => {
  test.beforeEach(({ privacyGuards }) => {
    privacyGuards.trackSensitive(MOCK_RECEIPT.protocol);
    privacyGuards.trackSensitive(MOCK_RECEIPT.accessKey);
    privacyGuards.trackSensitive('CPFs');
  });

  test('fluxo completo: relato, revisão, protocolo, cópia, download e conclusão', async ({
    page,
    request,
    browserName,
    privacyGuards,
  }) => {
    if (browserName === 'chromium') {
      await page.addInitScript(() => {
        const copied: string[] = [];
        (window as unknown as { __copied: string[] }).__copied = copied;
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: async (text: string) => void copied.push(text) },
        });
      });
    }
    await useMockSession(page, request);
    await fillMinimalReport(page);

    // Revisão mostra o que será enviado, com links de edição e o aviso de privacidade antes do botão.
    await expect(page.getByText('Colaborador')).toBeVisible();
    await expect(page.getByText('Vazamento de dados')).toBeVisible();
    await expect(page.getByText('Planilha com CPFs')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Editar relato' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ler o aviso de privacidade' })).toBeVisible();
    await page.getByRole('button', { name: 'Enviar denúncia' }).click();

    // Tela do protocolo, a partir da memória. A URL e o título não levam protocolo nem chave.
    await expect(page.locator('h1')).toHaveText('Protocolo gerado');
    await expect(page).toHaveURL(/\/nova-denuncia\/protocolo$/);
    await expect(page.getByTestId('protocol')).toHaveText(MOCK_RECEIPT.protocol);
    await expect(page.getByTestId('access-key')).toHaveText(MOCK_RECEIPT.accessKey);
    await expect(page.getByTestId('received-on')).toHaveText(/^\d{2}\/\d{2}\/\d{4}$/);
    await expect(page.getByText('Não é possível recuperá-la')).toBeVisible();
    expect(await page.title()).not.toContain(MOCK_RECEIPT.protocol);
    expect(await page.title()).not.toContain(MOCK_RECEIPT.accessKey);

    // Cópia: os dois caminhos da research R11. Na rede do e2e a origem não é um contexto seguro, então a área de
    // transferência não existe em nenhum navegador. No Chromium, um dublê de navigator.clipboard (instalado antes de a
    // página carregar) exercita o caminho de sucesso; no Firefox fica o caminho real de fallback.
    if (browserName === 'chromium') {
      await page.getByRole('button', { name: 'Copiar chave' }).click();
      await expect(page.getByRole('status')).toContainText('Chave copiada');
      expect(
        await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied),
      ).toEqual([MOCK_RECEIPT.accessKey]);
    } else {
      await page.getByRole('button', { name: 'Copiar chave' }).click();
      await expect(page.getByRole('status')).toContainText('selecione o texto e copie');
      await expect(page.getByTestId('access-key')).toHaveCSS('user-select', 'all');
    }

    // Download gerado no navegador, com nome fixo (sem protocolo nem chave no nome).
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Baixar comprovante (.txt)' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('comprovante-denuncia.txt');
    const text = readFileSync((await download.path()) as string, 'utf8');
    expect(text).toContain(MOCK_RECEIPT.protocol);
    expect(text).toContain(MOCK_RECEIPT.accessKey);

    // "Concluir" só depois de marcar que guardou; ao concluir, volta para o início.
    const finish = page.getByRole('button', { name: 'Concluir' });
    await expect(finish).toBeDisabled();
    await page.getByRole('checkbox', { name: 'Guardei o protocolo e a chave' }).check();
    await finish.click();
    await expect(page).toHaveURL(/\/$/);
    await privacyGuards.checkStorage();
  });

  test('clique duplo no envio lento gera um envio só', async ({ page, request }) => {
    const mock = await useMockSession(page, request, { submit: 'slow' });
    await fillMinimalReport(page);
    const send = page.getByRole('button', { name: 'Enviar denúncia' });
    // Dois cliques no mesmo tique, antes de a tela redesenhar.
    await send.evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    await expect(send).toBeDisabled();
    await expect(page.locator('h1')).toHaveText('Protocolo gerado', { timeout: 10_000 });
    expect(await mock.submissions()).toBe(1);
  });

  test('categorias com erro: mensagem e "Tentar de novo" sem perder o tipo escolhido', async ({
    page,
    request,
  }) => {
    const mock = await useMockSession(page, request, { categories: 'error' });
    await page.goto('/nova-denuncia/tipo');
    await page.getByRole('radio', { name: 'Parceiro' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
    await mock.setScenario({ categories: 'ok' });
    await page.getByRole('button', { name: 'Tentar de novo' }).click();
    await expect(page.getByRole('radio', { name: 'Atividade suspeita' })).toBeVisible();
    await page.getByRole('link', { name: /Voltar/ }).click();
    await expect(page.getByRole('radio', { name: 'Parceiro' })).toBeChecked();
  });

  test('categorias vazias: explica e não deixa avançar', async ({ page, request }) => {
    await useMockSession(page, request, { categories: 'empty' });
    await page.goto('/nova-denuncia/tipo');
    await page.getByRole('radio', { name: 'Terceiro' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByText('Não é possível enviar uma denúncia agora')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar' })).toHaveCount(0);
  });

  test('fluxo inteiro só com o teclado, do tipo até "Concluir" (SC-007)', async ({
    page,
    request,
  }) => {
    await useMockSession(page, request);
    await page.goto('/nova-denuncia/tipo');
    const tabTo = async (matches: (el: { role: string; name: string }) => boolean) => {
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab');
        const el = await page.evaluate(() => {
          const a = document.activeElement as HTMLElement | null;
          return {
            role: a?.getAttribute('type') ?? a?.tagName.toLowerCase() ?? '',
            name: (
              a?.getAttribute('aria-label') ??
              a?.labels?.[0]?.textContent ??
              a?.textContent ??
              ''
            ).trim(),
          };
        });
        if (matches(el)) return;
      }
      throw new Error('elemento não alcançado com Tab');
    };
    const pressButton = async (name: string) => {
      await tabTo((el) => el.name.includes(name));
      await page.keyboard.press('Enter');
    };

    await expectStep(page, 'Tipo de denunciante', 1);
    await tabTo((el) => el.role === 'radio');
    await page.keyboard.press('Space');
    await pressButton('Continuar');

    await expectStep(page, 'Categoria', 2);
    await tabTo((el) => el.role === 'radio');
    await page.keyboard.press('Space');
    await pressButton('Continuar');

    await expectStep(page, 'Relato', 3);
    await tabTo((el) => el.role === 'textarea' && el.name.includes('Descrição'));
    await page.keyboard.type(DESCRIPTION);
    await pressButton('Continuar');

    await expectStep(page, 'Envolvidos', 4);
    await pressButton('Continuar');

    await expectStep(page, 'Revisão', 5);
    await pressButton('Enviar denúncia');

    await expect(page.locator('h1')).toHaveText('Protocolo gerado');
    await tabTo((el) => el.role === 'checkbox');
    await page.keyboard.press('Space');
    await expect(
      page.getByRole('checkbox', { name: 'Guardei o protocolo e a chave' }),
    ).toBeChecked();
    await expect(page.getByRole('button', { name: 'Concluir' })).toBeEnabled();
    await pressButton('Concluir');
    await expect(page).toHaveURL(/\/$/);
  });
});
