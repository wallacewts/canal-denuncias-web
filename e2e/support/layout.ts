import { expect, type Page } from '@playwright/test';

/**
 * Larguras de FR-025: 320 px (celular estreito) e 640 px, que é o que uma janela de 1280 px mostra com zoom de 200%.
 */
export const NARROW_VIEWPORTS = [
  { name: '320 px', width: 320, height: 640 },
  { name: 'zoom de 200% (1280 px)', width: 640, height: 400 },
] as const;

/** Reprova se a página rolar na horizontal. */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'rolagem horizontal em px').toBeLessThanOrEqual(0);
}
