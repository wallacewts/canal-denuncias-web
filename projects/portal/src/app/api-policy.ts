import { inject } from '@angular/core';
import { type ApiPolicy } from '@canal/shared';
import { ReporterAccess } from './features/tracking/reporter-access';

/**
 * Portal público: nunca envia cookies. O token do denunciante (só em memória) vai apenas nas rotas de acompanhamento.
 */
export const PORTAL_API_POLICY: ApiPolicy = {
  audience: 'portal',
  withCredentials: false,
  bearerFor: '/public/v1/me/',
  // Acesso expirado: o ReporterAccess descarta a credencial, volta para a consulta (replaceUrl) e mostra o motivo lá.
  // Protocolo e chave nunca vão na URL.
  onUnauthenticated: () => inject(ReporterAccess).end('unauthorized'),
  silentUnauthenticated: true,
};
