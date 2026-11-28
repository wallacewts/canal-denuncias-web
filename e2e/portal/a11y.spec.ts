import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../fixtures/privacy-guards';
import { expectNoHorizontalScroll, NARROW_VIEWPORTS } from '../support/layout';
import { useMockSession } from '../support/mock-api';
import { DESCRIPTION } from './new-report-helpers';
import { PORTAL_ROUTES } from './routes';

/**
 * Acessibilidade do portal (FTRV-07, WCAG 2.1 AA). As guardas de privacidade e de CSP continuam ativas: o axe roda
 * sem bypassCSP.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

for (const route of PORTAL_ROUTES) {
  test(`portal ${route}: sem violação séria ou crítica de acessibilidade`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('h1').first()).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const blocking = violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
    expect(blocking).toEqual([]);
  });

  for (const viewport of NARROW_VIEWPORTS) {
    test(`portal ${route}: sem rolagem horizontal em ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route);
      await expect(page.locator('h1').first()).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }
}

test('portal: navegação só com teclado, com foco visível', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1').first()).toBeVisible();

  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  const outline = await focused.evaluate((el) => {
    const style = getComputedStyle(el);
    return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
  });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThan(0);

  // Chega ao link "Consultar" só com Tab e abre com Enter.
  for (let i = 0; i < 10; i++) {
    if ((await page.locator(':focus').textContent())?.includes('Consultar')) break;
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/consultar$/);
});

/**
 * Telas do envio com o fluxo preenchido (feature 002): cada etapa, a revisão com o diálogo do aviso de privacidade
 * aberto e a tela do protocolo com o comprovante. Abrir essas rotas direto mostraria outra tela (etapas puladas
 * voltam para a pendente, e o protocolo sem envio mostra só um aviso).
 */
test('envio de denúncia: axe em cada etapa, na revisão com o aviso aberto e no protocolo', async ({
  page,
  request,
}) => {
  await useMockSession(page, request);
  const analyze = async (where: string) => {
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const blocking = violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${where} · ${v.id}: ${v.help} (${v.nodes.length})`);
    expect(blocking).toEqual([]);
  };
  await page.goto('/nova-denuncia/tipo');
  await analyze('tipo');
  await page.getByRole('radio', { name: 'Colaborador' }).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('radio', { name: 'Vazamento de dados' })).toBeVisible();
  await analyze('categoria');
  await page.getByRole('radio', { name: 'Vazamento de dados' }).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await analyze('relato');
  await page.getByLabel('Descrição').fill(DESCRIPTION);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Adicionar envolvido' }).click();
  await analyze('envolvidos');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await analyze('revisão');
  await page.getByRole('button', { name: 'Ler o aviso de privacidade' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  // Espera a animação de abertura terminar: no meio dela, o contraste medido não é o final.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running'),
  );
  await analyze('revisão com o aviso aberto');
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.getByRole('button', { name: 'Enviar denúncia' }).click();
  await expect(page.locator('h1')).toHaveText('Protocolo gerado');
  await analyze('protocolo');
});
