import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { type Observable, of, throwError } from 'rxjs';
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

describe('Shell: Sair (BAUTH-06)', () => {
  function render(signOut: () => Observable<unknown>) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { routeConfig: { children: [] } } },
        { provide: AuthApi, useValue: { signOut: vi.fn(signOut) } },
      ],
    });
    const session = TestBed.inject(StaffSession);
    const end = vi.spyOn(session, 'end').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Sair',
    );
    return { button, end, api: TestBed.inject(AuthApi) };
  }

  it('chama a saída na API e encerra a sessão', () => {
    const { button, end, api } = render(() => of(null));
    button?.click();
    expect(api.signOut).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledWith('signed-out');
  });

  it('encerra a sessão mesmo se a chamada falhar', () => {
    const { button, end } = render(() => throwError(() => new Error('rede')));
    button?.click();
    expect(end).toHaveBeenCalledWith('signed-out');
  });
});
