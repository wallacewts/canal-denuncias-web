import {
  type HttpInterceptorFn,
  provideHttpClient,
  withFetch,
  withInterceptors,
  withNoXsrfProtection,
} from '@angular/common/http';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { provideApiConfiguration as providePublicApiConfiguration } from '../api/generated/public/api-configuration';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { API_PREFIX, apiInterceptor } from './api.interceptor';
import { API_POLICY, type ApiPolicy } from './api-policy';
import { credentialsInterceptor } from './credentials.interceptor';
import { errorInterceptor } from './error.interceptor';

/**
 * HttpClient configurado para a API do canal, com a política de credenciais do app.
 * A API protege a área administrativa contra escrita de outra origem pela verificação de origem (AUTH-07), sem token.
 * Por isso o HttpClient não usa a proteção XSRF do Angular (D63), que por padrão leria um cookie `XSRF-TOKEN` e
 * mandaria o cabeçalho `X-XSRF-TOKEN`.
 */
export function provideApi(
  config: AppConfig,
  policy: ApiPolicy,
  /** Interceptors do app que precisam ler o prefixo api: (ex.: atividade da sessão no backoffice). */
  extraInterceptors: readonly HttpInterceptorFn[] = [],
): (Provider | EnvironmentProviders)[] {
  return [
    { provide: APP_CONFIG, useValue: config },
    { provide: API_POLICY, useValue: policy },
    // O cliente gerado (público) chama a API com o prefixo api:, para passar pelos mesmos interceptors.
    providePublicApiConfiguration(API_PREFIX),
    provideHttpClient(
      withFetch(),
      // Ordem importa: credenciais e erros leem o prefixo api:, então rodam antes da troca do prefixo pela URL base.
      withInterceptors([
        credentialsInterceptor,
        errorInterceptor,
        ...extraInterceptors,
        apiInterceptor,
      ]),
      withNoXsrfProtection(),
    ),
  ];
}
