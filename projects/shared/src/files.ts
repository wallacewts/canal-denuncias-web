/**
 * Entrada secundária para gerar arquivos no navegador (ex.: comprovante do portal, códigos de recuperação do
 * backoffice). Código carregado sob demanda importa daqui, e não do barril `@canal/shared` (ver src/http.ts).
 */
export { downloadTextFile } from './lib/files/text-file';
