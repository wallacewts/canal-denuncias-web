import type { Routes } from '@angular/router';
import { authGuard, permissionGuard } from './features/auth/auth.guards';
import { stepGuard } from './features/auth/sign-in-flow';

const suffix = ' | Backoffice';

/**
 * Backoffice da equipe interna. O fluxo de entrada fica fora do `Shell`; toda tela interna exige sessão com segundo
 * fator verificado (`authGuard`) e, quando declarada, a permissão efetiva vinda da API (`data.ability`,
 * `permissionGuard`; contracts/auth-routes.md). O menu do `Shell` lê as mesmas declarações.
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Entrar' + suffix,
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'login/codigo',
    title: 'Código de verificação' + suffix,
    canActivate: [stepGuard('MFA_REQUIRED')],
    loadComponent: () =>
      import('./features/auth/mfa-challenge-page').then((m) => m.MfaChallengePage),
  },
  {
    path: 'primeiro-acesso',
    loadComponent: () =>
      import('./features/auth/first-access-layout').then((m) => m.FirstAccessLayout),
    children: [
      {
        path: 'senha',
        title: 'Trocar senha' + suffix,
        canActivate: [stepGuard('PASSWORD_CHANGE_REQUIRED')],
        loadComponent: () =>
          import('./features/auth/password-change-page').then((m) => m.PasswordChangePage),
      },
      {
        path: 'autenticador',
        title: 'Cadastrar aplicativo autenticador' + suffix,
        canActivate: [stepGuard('MFA_ENROLLMENT_REQUIRED')],
        loadComponent: () =>
          import('./features/auth/mfa-enrollment-page').then((m) => m.MfaEnrollmentPage),
      },
      {
        path: 'codigos',
        title: 'Códigos de recuperação' + suffix,
        loadComponent: () =>
          import('./features/auth/recovery-codes-page').then((m) => m.RecoveryCodesPage),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'painel' },
      {
        path: 'painel',
        title: 'Painel' + suffix,
        data: { nav: 'Painel' },
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'denuncias',
        title: 'Caixa de denúncias' + suffix,
        data: { nav: 'Caixa de denúncias', ability: 'reports.list' },
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/reports/report-inbox-page').then((m) => m.ReportInboxPage),
      },
      {
        path: 'denuncias/:id',
        title: 'Denúncia' + suffix,
        data: { ability: 'reports.read' },
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/reports/report-detail-page').then((m) => m.ReportDetailPage),
      },
      {
        path: 'triagem',
        title: 'Triagem' + suffix,
        data: { nav: 'Triagem e atribuição', ability: 'reports.triage' },
        canActivate: [permissionGuard],
        loadComponent: () => import('./features/triage/triage-page').then((m) => m.TriagePage),
      },
      {
        path: 'relatorios',
        title: 'Relatórios' + suffix,
        data: { nav: 'Relatórios', ability: 'dashboard.read' },
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/reporting/reporting-page').then((m) => m.ReportingPage),
      },
      {
        path: 'usuarios',
        title: 'Usuários' + suffix,
        data: { nav: 'Usuários e perfis', ability: 'users.manage' },
        canActivate: [permissionGuard],
        loadComponent: () => import('./features/users/users-page').then((m) => m.UsersPage),
      },
      {
        path: 'configuracoes',
        title: 'Configurações' + suffix,
        data: { nav: 'Configurações', ability: 'settings.sla' },
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/settings/settings-page').then((m) => m.SettingsPage),
      },
      {
        path: 'auditoria',
        title: 'Trilha de auditoria' + suffix,
        data: { nav: 'Trilha de auditoria', ability: 'audit.read' },
        canActivate: [permissionGuard],
        loadComponent: () =>
          import('./features/audit/audit-trail-page').then((m) => m.AuditTrailPage),
      },
      {
        path: 'perfil',
        title: 'Meu perfil' + suffix,
        data: { nav: 'Meu perfil' },
        loadComponent: () => import('./features/profile/profile-page').then((m) => m.ProfilePage),
      },
      {
        path: 'acesso-negado',
        title: 'Acesso negado' + suffix,
        loadComponent: () => import('./features/auth/access-denied').then((m) => m.AccessDenied),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
