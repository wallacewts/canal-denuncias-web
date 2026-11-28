import type { Page } from '@playwright/test';

/**
 * Recarrega (ou navega) só depois de a página terminar de baixar o que pediu (chunks e fontes). Recarregar no meio de um download
 * faz o Firefox abortar a requisição (NS_BINDING_ABORTED) e escrever no console "downloadable font: download failed"
 * ou uma falha de integridade (SRI) do chunk, que a guarda de console acusa. Isso é efeito do teste, não do app: uma
 * fonte ou chunk que falhe de verdade continua aparecendo, porque a espera não engole erro nenhum.
 */
export async function reloadWhenSettled(page: Page) {
  await waitUntilSettled(page);
  await page.reload();
}

/** Espera a rede ociosa e as fontes carregadas (antes de recarregar). */
export async function waitUntilSettled(page: Page) {
  await page.waitForLoadState('networkidle');
  await waitForFonts(page);
}

/**
 * Espera só as fontes da página terminarem de baixar. Use antes de uma navegação completa (`goto`) logo depois de abrir
 * a página e fazer chamadas dentro dela: no Chromium, o `networkidle` pode não chegar depois de um `fetch` feito pela
 * página, e a falha observada nesse caso é só a fonte abortada.
 */
export async function waitForFonts(page: Page) {
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}
