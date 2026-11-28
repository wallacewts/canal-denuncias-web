import type { ApiPolicy } from '@canal/shared';

/**
 * Portal público: nunca envia cookies. O token do denunciante (só em memória) vai apenas nas rotas de acompanhamento.
 */
export const PORTAL_API_POLICY: ApiPolicy = {
  withCredentials: false,
  bearerFor: '/public/v1/me/',
  // Implementado na T038 (US2): limpar a sessão do denunciante e ir para /consultar.
  onUnauthenticated: () => undefined,
};
