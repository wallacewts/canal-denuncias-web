import { expect, test } from '../fixtures/privacy-guards';
import { useMockSession } from '../support/mock-api';
import { expectNoHorizontalScroll, NARROW_VIEWPORTS } from '../support/layout';
import { DESCRIPTION } from './new-report-helpers';
import { openTracking } from './tracking-helpers';

/**
 * FR-042: as telas do envio funcionam em 320 px e com zoom de 200%, sem rolagem horizontal, inclusive com textos
 * longos e com envolvidos adicionados. As rotas soltas do portal já são cobertas em a11y.spec.ts.
 */
for (const viewport of NARROW_VIEWPORTS) {
  test(`envio de denúncia: sem rolagem horizontal em ${viewport.name}`, async ({
    page,
    request,
  }) => {
    await useMockSession(page, request);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/nova-denuncia/tipo');
    await expectNoHorizontalScroll(page);
    await page.getByRole('radio', { name: 'Colaborador' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('radio', { name: 'Vazamento de dados' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.getByRole('radio', { name: 'Vazamento de dados' }).check();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByLabel('Descrição').fill(DESCRIPTION + 'palavra'.repeat(200));
    await page.getByRole('radio', { name: 'Só mês e ano' }).check();
    await page.getByLabel('Mês', { exact: true }).selectOption('01');
    await page.getByLabel('Ano', { exact: true }).selectOption({ index: 1 });
    await expectNoHorizontalScroll(page);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Adicionar envolvido' }).click();
    await expectNoHorizontalScroll(page);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expectNoHorizontalScroll(page);
    await page.getByRole('button', { name: 'Enviar denúncia' }).click();
    await expect(page.locator('h1')).toHaveText('Protocolo gerado');
    await expectNoHorizontalScroll(page);
  });
}

for (const viewport of NARROW_VIEWPORTS) {
  test(`acompanhamento: sem rolagem horizontal em ${viewport.name}`, async ({ page, request }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openTracking(page, request, { report: 'awaiting' });
    await expectNoHorizontalScroll(page);
    await page.getByLabel('Sua mensagem').fill('palavra'.repeat(300));
    await expectNoHorizontalScroll(page);
  });
}
