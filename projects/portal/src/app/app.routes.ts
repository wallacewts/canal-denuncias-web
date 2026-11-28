import type { Routes } from '@angular/router';
import { reporterAccessGuard } from './features/tracking/reporter-access.guard';
import { leaveFlowGuard, leaveProtocolGuard } from './features/new-report/new-report-flow.guards';

const suffix = ' | Canal de Denúncias';

/**
 * Portal público (8 telas). Regra: protocolo, chave e dados do relato nunca vão na URL. O fluxo de envio é uma rota-pai
 * que guarda o rascunho e o comprovante só em memória (feature 002, research.md R3).
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
    path: 'nova-denuncia',
    loadComponent: () =>
      import('./features/new-report/new-report-flow').then((m) => m.NewReportFlow),
    canDeactivate: [leaveFlowGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tipo' },
      {
        path: 'tipo',
        title: 'Tipo de denunciante' + suffix,
        loadComponent: () =>
          import('./features/new-report/steps/reporter-type-step').then((m) => m.ReporterTypeStep),
      },
      {
        path: 'categoria',
        title: 'Categoria' + suffix,
        loadComponent: () =>
          import('./features/new-report/steps/category-step').then((m) => m.CategoryStep),
      },
      {
        path: 'relato',
        title: 'Relato' + suffix,
        loadComponent: () =>
          import('./features/new-report/steps/description-step').then((m) => m.DescriptionStep),
      },
      {
        path: 'envolvidos',
        title: 'Envolvidos' + suffix,
        loadComponent: () =>
          import('./features/new-report/steps/involved-step').then((m) => m.InvolvedStep),
      },
      {
        path: 'revisao',
        title: 'Revisão' + suffix,
        loadComponent: () => import('./features/new-report/review-page').then((m) => m.ReviewPage),
      },
      {
        path: 'protocolo',
        title: 'Protocolo gerado' + suffix,
        canDeactivate: [leaveProtocolGuard],
        loadComponent: () =>
          import('./features/new-report/protocol-issued-page').then((m) => m.ProtocolIssuedPage),
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
    canActivate: [reporterAccessGuard],
    loadComponent: () => import('./features/tracking/tracking-page').then((m) => m.TrackingPage),
  },
  {
    path: 'ajuda',
    title: 'Ajuda' + suffix,
    loadComponent: () => import('./features/help/help-page').then((m) => m.HelpPage),
  },
  { path: '**', redirectTo: '' },
];
