import type { ApiPolicy } from './api-policy';

/**
 * Tabela única de mensagens (contracts/error-messages.md). Cada mensagem diz o que aconteceu e o que fazer
 * (constituição, princípio IV). O `message` da API nunca é exibido.
 */
const BY_STATUS: Record<number, string> = {
  0: 'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.',
  400: 'Alguns dados não foram aceitos. Revise os campos destacados e tente de novo.',
  403: 'Você não tem permissão para fazer isso. Se achar que deveria ter, fale com o administrador.',
  404: 'Não encontramos o que você procurou. Ele pode ter sido removido. Volte à página anterior e tente de novo.',
  409: 'Essa informação mudou enquanto você trabalhava. Atualize a página e tente de novo.',
  410: 'Este conteúdo não está mais disponível. Volte à página inicial para continuar.',
  429: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.',
};

const UNAUTHENTICATED: Record<ApiPolicy['audience'], string> = {
  backoffice: 'Sua sessão terminou. Entre de novo para continuar.',
  portal: 'Seu acesso ao acompanhamento expirou. Informe o protocolo e a chave de novo.',
};

export const UNEXPECTED_ERROR_MESSAGE =
  'Algo deu errado do nosso lado. Tente de novo em alguns minutos.';

export function errorMessageFor(status: number, audience: ApiPolicy['audience']): string {
  if (status === 401) return UNAUTHENTICATED[audience];
  return BY_STATUS[status] ?? UNEXPECTED_ERROR_MESSAGE;
}

export function withSupportCode(message: string, requestId: string | null): string {
  return requestId ? `${message} Código para o suporte: ${requestId}` : message;
}
