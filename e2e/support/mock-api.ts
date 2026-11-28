import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';

/** Servidor simulado da API (tools/mock-api), acessado direto pela rede do e2e, sem passar pelo app. */
const MOCK = 'http://e2e-api:3000';

export interface MockScenario {
  categories?: 'ok' | 'empty' | 'error';
  submit?: 'ok' | 'invalid' | 'error' | 'slow';
  access?: 'ok' | 'invalid' | 'rate-limited' | 'error' | 'slow';
  me?: 'ok' | 'unauthorized';
  report?:
    | 'received'
    | 'in-review'
    | 'awaiting'
    | 'awaiting-overdue'
    | 'concluded-substantiated'
    | 'concluded-partial'
    | 'concluded-unsubstantiated'
    | 'closed'
    | 'error';
  messages?: 'some' | 'empty' | 'error';
  send?: 'ok' | 'closed' | 'invalid' | 'error' | 'slow';
  /** Etapa da senha do backoffice: 429 recebe a mesma mensagem genérica (feature 004). */
  signIn?: 'ok' | 'rate-limited';
  /** Desafio do segundo fator: código recusado ou bloqueio temporário (423). */
  challenge?: 'ok' | 'invalid' | 'locked' | 'rate-limited';
}

/** Contadores do simulador (contracts/mock-api-tracking.md). */
export interface MockStats {
  submissions: number;
  sessions: number;
  messages: number;
  messageReads: number;
}

/** Contas e credenciais do simulador de autenticação (specs/004-backoffice-sign-in/contracts/auth-api.md). */
export const STAFF = {
  pronta: 'pronta.SIMULADA@canal.test',
  primeiroAcesso: 'primeiro-acesso.SIMULADA@canal.test',
  bloqueada: 'bloqueada.SIMULADA@canal.test',
  desativada: 'desativada.SIMULADA@canal.test',
  semPermissoes: 'sem-permissoes.SIMULADA@canal.test',
  trocaComAutenticador: 'troca-com-autenticador.SIMULADA@canal.test',
  password: 'senha-correta-SIMULADA',
  provisionalPassword: 'provisoria-SIMULADA',
  totp: '123456',
  recoveryCode: 'SIMULADA-REC-0001',
} as const;

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
  const stats = async () =>
    (await (await request.get(`${MOCK}/__mock/stats`, { headers })).json()) as MockStats;
  return {
    setScenario: (next: MockScenario) =>
      request.post(`${MOCK}/__mock/scenario`, { headers, data: next }),
    submissions: async () => (await stats()).submissions,
    stats,
    /** A próxima leitura de mensagens traz uma mensagem nova da equipe. */
    newTeamMessage: () => request.post(`${MOCK}/__mock/new-team-message`, { headers }),
    /** Avança o relógio do simulador (horários de expiração da sessão da equipe). */
    advanceClock: (ms: number) =>
      request.post(`${MOCK}/__mock/clock`, { headers, data: { advanceMs: ms } }),
    /** Encerra todas as sessões da equipe no simulador: a próxima chamada recebe 401. */
    revokeStaffSessions: () => request.post(`${MOCK}/__mock/auth/revoke`, { headers }),
    authStats: async () =>
      (await (await request.get(`${MOCK}/__mock/auth/stats`, { headers })).json()) as {
        sessions: number;
        crossOriginRejections: number;
      },
    session,
  };
}
