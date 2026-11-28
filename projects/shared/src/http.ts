/**
 * Entrada secundária com primitivas HTTP que código carregado sob demanda pode importar sem passar pelo barril
 * `@canal/shared`. Importar do barril, numa rota lazy, um símbolo que já está no bundle inicial (como este token, que o
 * errorInterceptor usa) obriga o build a colocar o barril inteiro, com todos os componentes da lib, no bundle inicial
 * (feature 003: +100 kB). Use `@canal/shared/http` para estes símbolos.
 */
export { API_CALLER_HANDLES } from './lib/http/error.interceptor';
