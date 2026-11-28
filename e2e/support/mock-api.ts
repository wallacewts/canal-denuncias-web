import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';

/** Servidor simulado da API (tools/mock-api), acessado direto pela rede do e2e, sem passar pelo app. */
const MOCK = 'http://e2e-api:3000';

export interface MockScenario {
  categories?: 'ok' | 'empty' | 'error';
  submit?: 'ok' | 'invalid' | 'error' | 'slow';
}

/** Valores que o simulador devolve (contracts/mock-api.md). */
export const MOCK_RECEIPT = {
  protocol: 'DV-SIMUL-ADO00',
  accessKey: 'SIMULADA-K7Q2-M9XR-4TPA-W3ZN',
} as const;

/**
 * Isola o teste numa sessão própria do simulador: as requisições do app levam o cabeçalho x-mock-session (o proxy
 * /api do portal o repassa), e o cenário e o contador ficam separados dos outros testes em paralelo.
 */
export async function useMockSession(
  page: Page,
  request: APIRequestContext,
  scenario: MockScenario = {},
) {
  const session = randomUUID();
  const headers = { 'x-mock-session': session };
  await page.setExtraHTTPHeaders(headers);
  await request.post(`${MOCK}/__mock/reset`, { headers });
  if (Object.keys(scenario).length) {
    await request.post(`${MOCK}/__mock/scenario`, { headers, data: scenario });
  }
  return {
    setScenario: (next: MockScenario) =>
      request.post(`${MOCK}/__mock/scenario`, { headers, data: next }),
    submissions: async () =>
      (
        (await (await request.get(`${MOCK}/__mock/stats`, { headers })).json()) as {
          submissions: number;
        }
      ).submissions,
  };
}
