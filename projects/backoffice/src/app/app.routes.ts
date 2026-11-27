import type { Routes } from '@angular/router';

const suffix = ' | Backoffice';

/** Backoffice da equipe interna (10 telas). */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Entrar' + suffix,
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    // TODO: authGuard quando o módulo auth da API existir.
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'painel' },
      {
        path: 'painel',
        title: 'Painel' + suffix,
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'denuncias',
        title: 'Caixa de denúncias' + suffix,
        loadComponent: () =>
          import('./features/reports/report-inbox-page').then((m) => m.ReportInboxPage),
      },
      {
        path: 'denuncias/:id',
        title: 'Denúncia' + suffix,
        loadComponent: () =>
          import('./features/reports/report-detail-page').then((m) => m.ReportDetailPage),
      },
      {
        path: 'triagem',
        title: 'Triagem' + suffix,
        loadComponent: () => import('./features/triage/triage-page').then((m) => m.TriagePage),
      },
      {
        path: 'relatorios',
        title: 'Relatórios' + suffix,
        loadComponent: () =>
          import('./features/reporting/reporting-page').then((m) => m.ReportingPage),
      },
      {
        path: 'usuarios',
        title: 'Usuários' + suffix,
        loadComponent: () => import('./features/users/users-page').then((m) => m.UsersPage),
      },
      {
        path: 'configuracoes',
        title: 'Configurações' + suffix,
        loadComponent: () =>
          import('./features/settings/settings-page').then((m) => m.SettingsPage),
      },
      {
        path: 'auditoria',
        title: 'Trilha de auditoria' + suffix,
        loadComponent: () =>
          import('./features/audit/audit-trail-page').then((m) => m.AuditTrailPage),
      },
      {
        path: 'perfil',
        title: 'Meu perfil' + suffix,
        loadComponent: () => import('./features/profile/profile-page').then((m) => m.ProfilePage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
