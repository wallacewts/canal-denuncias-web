/*
 * Entry point `@canal/shared/api/admin`: cliente gerado de `openapi/admin.json` (rotas /api/admin/v1).
 * SÓ o backoffice pode importar: o lint reprova este import dentro de projects/portal. Os arquivos gerados ficam em
 * `../lib/api/generated/admin/` e nunca são editados à mão (`npm run api:sync && npm run api:generate`).
 */
export * from '../lib/api/generated/admin/models';
export * from '../lib/api/generated/admin/functions';
export { Api as AdminApi } from '../lib/api/generated/admin/api';
export {
  ApiConfiguration as AdminApiConfiguration,
  provideApiConfiguration as provideAdminApiConfiguration,
} from '../lib/api/generated/admin/api-configuration';
