import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../fixtures/privacy-guards';
import { expectNoHorizontalScroll, NARROW_VIEWPORTS } from '../support/layout';

/** Página inicial (US3 da feature 002, PINF-01): o canal, as garantias e os dois caminhos. Não depende da API. */
test.describe('página inicial', () => {
  test('explica o que relatar, quem pode relatar e as garantias', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Canal de Denúncias');
    const main = page.locator('main');
    for (const text of [
      'Vazamento de dados',
      'Prática inadequada de segurança',
      'Atividade suspeita',
    ]) {
      await expect(main).toContainText(text);
    }
    for (const text of ['Colaboradores', 'Parceiros', 'Terceiros']) {
      await expect(main).toContainText(text);
    }
    for (const text of [
      'Sem cadastro',
      'Sem registro de IP',
      'Relato cifrado',
      'Identidade opcional e lacrada',
    ]) {
      await expect(main).toContainText(text);
    }
    await expect(main).toContainText('dispositivo e uma rede pessoais');
  });

  test('"Fazer uma denúncia" abre o wizard e "Consultar uma denúncia" abre a consulta', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Fazer uma denúncia' }).click();
    await expect(page).toHaveURL(/\/nova-denuncia\/tipo$/);
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Consultar uma denúncia' }).click();
    await expect(page).toHaveURL(/\/consultar$/);
  });

  test('sem violação de acessibilidade e sem rolagem horizontal nas larguras estreitas', async ({
    page,
  }) => {
    await page.goto('/');
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    for (const viewport of NARROW_VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expectNoHorizontalScroll(page);
    }
  });
});
