import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../fixtures/privacy-guards';
import { expectNoHorizontalScroll, NARROW_VIEWPORTS } from '../support/layout';
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
