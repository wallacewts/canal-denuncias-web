import { expect, test } from '../fixtures/privacy-guards';
import { expectNoHorizontalScroll, NARROW_VIEWPORTS } from '../support/layout';
import { signInByApi } from './auth-helpers';
import { BACKOFFICE_ROUTES } from './routes';
import { walkFirstAccessScreens, walkSignedInScreens, walkSignInScreens } from './screens';

/** FR-025 no backoffice: funciona em 320 px e com zoom de 200%, sem rolagem horizontal. */
for (const route of BACKOFFICE_ROUTES) {
  for (const viewport of NARROW_VIEWPORTS) {
    test(`backoffice ${route}: sem rolagem horizontal em ${viewport.name}`, async ({
      page,
      request,
    }) => {
      if (route !== '/login') await signInByApi(page, request);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route);
      await expect(page.locator('h1').first()).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }
}

/** Telas do acesso da equipe que só abrem com estado (feature 004, T050). */
for (const viewport of NARROW_VIEWPORTS) {
  for (const [name, walk] of [
    ['entrada', walkSignInScreens],
    ['primeiro acesso', walkFirstAccessScreens],
    ['acesso negado e perfil', walkSignedInScreens],
  ] as const) {
    test(`backoffice ${name}: sem rolagem horizontal em ${viewport.name}`, async ({
      page,
      request,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await walk(page, request, () => expectNoHorizontalScroll(page));
    });
  }
}
