import type { CanDeactivateFn } from '@angular/router';
import type { NewReportFlow } from './new-report-flow';
import type { ProtocolIssuedPage } from './protocol-issued-page';

/** Saída do fluxo com rascunho preenchido pede confirmação; navegação dentro do fluxo passa (research.md R6). */
export const leaveFlowGuard: CanDeactivateFn<NewReportFlow> = (flow, _route, _current, next) =>
  next?.url.startsWith('/nova-denuncia') ? true : flow.confirmLeave();

/** Sair da tela do protocolo sem concluir (inclusive pelo botão voltar do navegador) pede confirmação. */
export const leaveProtocolGuard: CanDeactivateFn<ProtocolIssuedPage> = (page) => page.canLeave();
