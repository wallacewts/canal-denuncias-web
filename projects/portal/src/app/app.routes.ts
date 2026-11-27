import type { Routes } from '@angular/router';

const suffix = ' | Canal de Denúncias';

/**
 * Portal público (8 telas). Regra: protocolo, chave e dados do relato nunca vão na URL.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Canal de Denúncias',
    loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'privacidade',
    title: 'Aviso de privacidade' + suffix,
    loadComponent: () =>
      import('./features/privacy/privacy-notice-page').then((m) => m.PrivacyNoticePage),
  },
  {
    path: 'nova-denuncia/revisao',
    title: 'Revisão' + suffix,
    loadComponent: () => import('./features/new-report/review-page').then((m) => m.ReviewPage),
  },
  {
    path: 'nova-denuncia/protocolo',
    title: 'Protocolo gerado' + suffix,
    loadComponent: () =>
      import('./features/new-report/protocol-issued-page').then((m) => m.ProtocolIssuedPage),
  },
  {
    path: 'nova-denuncia',
    title: 'Nova denúncia' + suffix,
    loadComponent: () =>
      import('./features/new-report/new-report-wizard').then((m) => m.NewReportWizard),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tipo' },
      {
        path: 'tipo',
        loadComponent: () =>
          import('./features/new-report/steps/reporter-type-step').then((m) => m.ReporterTypeStep),
      },
      {
        path: 'categoria',
        loadComponent: () =>
          import('./features/new-report/steps/category-step').then((m) => m.CategoryStep),
      },
      {
        path: 'relato',
        loadComponent: () =>
          import('./features/new-report/steps/description-step').then((m) => m.DescriptionStep),
      },
      {
        path: 'envolvidos',
        loadComponent: () =>
          import('./features/new-report/steps/involved-step').then((m) => m.InvolvedStep),
      },
      {
        path: 'anexos',
        loadComponent: () =>
          import('./features/new-report/steps/attachments-step').then((m) => m.AttachmentsStep),
      },
      {
        path: 'identificacao',
        loadComponent: () =>
          import('./features/new-report/steps/identification-step').then(
            (m) => m.IdentificationStep,
          ),
      },
    ],
  },
  {
    path: 'consultar',
    title: 'Consultar denúncia' + suffix,
    loadComponent: () =>
      import('./features/tracking/tracking-access-page').then((m) => m.TrackingAccessPage),
  },
  {
    path: 'acompanhamento',
    title: 'Acompanhamento' + suffix,
    loadComponent: () => import('./features/tracking/tracking-page').then((m) => m.TrackingPage),
  },
  {
    path: 'ajuda',
    title: 'Ajuda' + suffix,
    loadComponent: () => import('./features/help/help-page').then((m) => m.HelpPage),
  },
  { path: '**', redirectTo: '' },
];
