import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthApi } from '../features/auth/auth.api';
import { StaffSession } from '../features/auth/staff-session';
import { Shell } from './shell';

const CHILDREN = [
  { path: '', redirectTo: 'painel' },
  { path: 'painel', data: { nav: 'Painel' } },
  { path: 'denuncias', data: { nav: 'Caixa de denúncias', ability: 'reports.list' } },
  { path: 'denuncias/:id', data: { ability: 'reports.read' } },
  { path: 'usuarios', data: { nav: 'Usuários e perfis', ability: 'users.manage' } },
  { path: 'perfil', data: { nav: 'Meu perfil' } },
  { path: 'acesso-negado' },
];

describe('Shell: menu por permissão (BAUTH-05, FR-013)', () => {
  function render(abilities: string[]) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { routeConfig: { children: CHILDREN } } },
        { provide: AuthApi, useValue: { signOut: () => of(null) } },
      ],
    });
    const session = TestBed.inject(StaffSession);
    vi.spyOn(session, 'can').mockImplementation((a: string) => abilities.includes(a));
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    const labels = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('nav a, mat-nav-list a'),
    ].map((a) => a.textContent?.trim());
    return { labels };
  }

  it('mostra só os itens permitidos pelas permissões da API', () => {
    expect(render(['reports.list']).labels).toEqual(['Painel', 'Caixa de denúncias', 'Meu perfil']);
  });

  it('sem permissões: só Painel e Meu perfil; acesso negado e detalhe nunca entram no menu', () => {
    expect(render([]).labels).toEqual(['Painel', 'Meu perfil']);
  });
});
