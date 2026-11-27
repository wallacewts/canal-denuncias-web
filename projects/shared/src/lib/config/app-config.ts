import { InjectionToken } from '@angular/core';

/** Configuração carregada em tempo de execução de /config.json (montado no container). */
export interface AppConfig {
  /** Base das chamadas à API. Em produção, "/api" no mesmo domínio (proxy reverso). */
  apiBaseUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

function isAppConfig(value: unknown): value is AppConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AppConfig).apiBaseUrl === 'string'
  );
}

/**
 * Lê /config.json antes do bootstrap. A mesma imagem serve todos os ambientes:
 * só o arquivo montado muda.
 */
export async function loadAppConfig(url = '/config.json'): Promise<AppConfig> {
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Não foi possível carregar ${url} (HTTP ${response.status})`);
  }
  const config: unknown = await response.json();
  if (!isAppConfig(config)) {
    throw new Error(`${url} inválido: apiBaseUrl é obrigatório`);
  }
  return { apiBaseUrl: config.apiBaseUrl.replace(/\/+$/, '') };
}
