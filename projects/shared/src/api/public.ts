/*
 * Entry point `@canal/shared/api/public`: cliente gerado de `openapi/public.json` (rotas /api/public/v1).
 * Pode ser importado pelo portal e pelo backoffice. Os arquivos gerados ficam em `../lib/api/generated/public/` e
 * nunca são editados à mão (`npm run api:sync && npm run api:generate`).
 *
 * Quando o contrato tiver rotas, reexporte também `../lib/api/generated/public/functions`.
 */
export * from '../lib/api/generated/public/models';
export { Api as PublicApi } from '../lib/api/generated/public/api';
export {
  ApiConfiguration as PublicApiConfiguration,
  provideApiConfiguration as providePublicApiConfiguration,
} from '../lib/api/generated/public/api-configuration';
