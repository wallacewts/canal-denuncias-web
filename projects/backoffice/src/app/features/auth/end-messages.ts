import type { EndReason } from './staff-session';

/** Mensagens do encerramento, mostradas uma vez na tela de login (contracts/auth-routes.md). */
export const END_MESSAGES: Record<EndReason, string> = {
  'signed-out': 'Você saiu do backoffice.',
  idle: 'Sua sessão terminou por falta de uso. Entre de novo para continuar.',
  absolute: 'Sua sessão atingiu o limite de 8 horas. Entre de novo para continuar.',
  unauthenticated: 'Sua sessão terminou. Entre de novo para continuar.',
  'other-tab': 'Você saiu do backoffice em outra aba.',
};
