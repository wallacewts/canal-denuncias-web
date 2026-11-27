import type { Route } from '@angular/router';
import { routes } from './app.routes';

function countScreens(list: Route[]): number {
  return list.reduce(
    (total, r) =>
      total +
      (r.loadComponent && !r.children ? 1 : 0) +
      (r.children ? countScreens(r.children) : 0),
    0,
  );
}

describe('Rotas do backoffice', () => {
  it('define as 10 telas (detalhe da denúncia conta como tela própria)', () => {
    expect(countScreens(routes)).toBe(10);
  });

  it('deixa o login fora da área autenticada', () => {
    const shell = routes.find((r) => r.path === '');
    expect(shell?.children?.some((c) => c.path === 'login')).toBe(false);
    expect(routes.some((r) => r.path === 'login')).toBe(true);
  });
});
