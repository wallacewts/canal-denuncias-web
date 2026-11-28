import { inject } from '@angular/core';
import { type CanActivateChildFn, type CanActivateFn, Router } from '@angular/router';
import { stepRoute } from './sign-in-flow';
import { StaffSession } from './staff-session';

/**
 * Toda tela interna exige sessão com segundo fator verificado (FR-011). Sem usuário em memória, tenta restaurar pelo
 * `/me` (o cookie sobrevive ao recarregar); sem sessão, vai ao login guardando o caminho só em memória. Com uma etapa
 * pendente em memória, leva à etapa (FR-012).
 */
export const authGuard: CanActivateFn & CanActivateChildFn = async (_route, state) => {
  const session = inject(StaffSession);
  const router = inject(Router);
  if (session.authenticated()) return true;
  const pending = session.pending();
  if (pending && !session.pendingExpired()) return router.parseUrl(stepRoute(pending.step));
  if (await session.restore()) return true;
  session.rememberReturn(state.url);
  return router.parseUrl('/login');
};

/**
 * Permissão exigida pela rota (`data.ability`), a partir das permissões efetivas da API (Q1, USERS-07). O front não
 * copia a matriz de perfis; a API continua checando cada rota.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const ability = route.data?.['ability'];
  if (typeof ability !== 'string') return true;
  return inject(StaffSession).can(ability) || inject(Router).parseUrl('/acesso-negado');
};
