import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '../fixtures/privacy-guards';
import { MOCK_RECEIPT, type MockScenario, useMockSession } from '../support/mock-api';

export const TRACKING_TITLE = 'Acompanhamento da denúncia';

/** Preenche a consulta com o protocolo e a chave do simulador e confirma. */
export async function submitAccess(
  page: Page,
  protocol: string = MOCK_RECEIPT.protocol,
  accessKey: string = MOCK_RECEIPT.accessKey,
) {
  await page.getByLabel('Protocolo', { exact: true }).fill(protocol);
  await page.getByLabel('Chave de acesso', { exact: true }).fill(accessKey);
  await page.getByRole('button', { name: 'Consultar', exact: true }).click();
}

/** Abre o acompanhamento numa sessão própria do simulador e espera a tela carregar. */
export async function openTracking(
  page: Page,
  request: APIRequestContext,
  scenario: MockScenario = {},
) {
  const mock = await useMockSession(page, request, scenario);
  await page.goto('/consultar');
  await submitAccess(page);
  await expect(page.locator('h1')).toHaveText(TRACKING_TITLE);
  return mock;
}
