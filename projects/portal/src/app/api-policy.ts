import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { type ApiPolicy, ReporterSession } from '@canal/shared';

/**
 * Portal público: nunca envia cookies. O token do denunciante (só em memória) vai apenas nas rotas de acompanhamento.
 */
export const PORTAL_API_POLICY: ApiPolicy = {
  audience: 'portal',
  withCredentials: false,
  bearerFor: '/public/v1/me/',
  // Acesso expirado: descarta o token e volta para a consulta. Protocolo e chave nunca vão na URL.
  onUnauthenticated: () => {
    inject(ReporterSession).clear();
    void inject(Router).navigateByUrl('/consultar');
  },
};
