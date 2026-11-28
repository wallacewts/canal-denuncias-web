import type { Route } from '@angular/router';
import { routes } from './app.routes';
import { authGuard, permissionGuard } from './features/auth/auth.guards';

/** Telas de apoio da autenticação, fora das 10 telas do backoffice. */
const AUTH_SUPPORT = new Set(['acesso-negado', 'login/codigo', 'primeiro-acesso']);

function countScreens(list: Route[]): number {
  return list.reduce(
    (total, r) =>
      total +
      (r.loadComponent && !r.children && !AUTH_SUPPORT.has(r.path ?? '') ? 1 : 0) +
      (r.children && !AUTH_SUPPORT.has(r.path ?? '') ? countScreens(r.children) : 0),
    0,
  );
}

const shell = routes.find((r) => r.path === '');

describe('Rotas do backoffice', () => {
  it('define as 10 telas (detalhe da denúncia conta como tela própria)', () => {
    expect(countScreens(routes)).toBe(10);
  });

  it('deixa o login fora da área autenticada', () => {
    expect(shell?.children?.some((c) => c.path === 'login')).toBe(false);
    expect(routes.some((r) => r.path === 'login')).toBe(true);
  });

  it('protege toda a área interna com o authGuard (FR-011)', () => {
    expect(shell?.canActivate).toContain(authGuard);
    expect(shell?.canActivateChild).toContain(authGuard);
  });

  it('toda rota com permissão declarada passa pelo permissionGuard (FR-013)', () => {
    for (const child of shell?.children ?? []) {
      if (child.data?.['ability']) expect(child.canActivate).toContain(permissionGuard);
    }
  });
});
