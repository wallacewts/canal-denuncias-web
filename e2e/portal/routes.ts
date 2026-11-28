/**
 * Rotas que existem hoje no portal (projects/portal/src/app/app.routes.ts). Sem acesso aberto, `/acompanhamento` leva
 * para `/consultar` (guard da feature 003); com acesso, ela é testada em `routes.spec.ts` e nos specs de acompanhamento.
 */
export const PORTAL_ROUTES = [
  '/',
  '/privacidade',
  '/nova-denuncia/tipo',
  '/nova-denuncia/categoria',
  '/nova-denuncia/relato',
  '/nova-denuncia/envolvidos',
  '/nova-denuncia/revisao',
  '/nova-denuncia/protocolo',
  '/consultar',
  '/acompanhamento',
  '/ajuda',
] as const;
