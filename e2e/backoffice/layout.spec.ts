import { expect, test } from '../fixtures/privacy-guards';
import { expectNoHorizontalScroll, NARROW_VIEWPORTS } from '../support/layout';
import { BACKOFFICE_ROUTES } from './routes';

/** FR-025 no backoffice: funciona em 320 px e com zoom de 200%, sem rolagem horizontal. */
for (const route of BACKOFFICE_ROUTES) {
  for (const viewport of NARROW_VIEWPORTS) {
    test(`backoffice ${route}: sem rolagem horizontal em ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route);
      await expect(page.locator('h1').first()).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }
}
