import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
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
 * O token CSRF é lido pelo próprio Angular do cookie XSRF-TOKEN e reenviado no cabeçalho X-XSRF-TOKEN
 * (só funciona com a API no mesmo domínio, que é o desenho de produção).
 */
export function provideApi(
  config: AppConfig,
  policy: ApiPolicy,
): (Provider | EnvironmentProviders)[] {
  return [
    { provide: APP_CONFIG, useValue: config },
    { provide: API_POLICY, useValue: policy },
    // O cliente gerado (público) chama a API com o prefixo api:, para passar pelos mesmos interceptors.
    providePublicApiConfiguration(API_PREFIX),
    provideHttpClient(
      withFetch(),
      // Ordem importa: credenciais e erros leem o prefixo api:, então rodam antes da troca do prefixo pela URL base.
      withInterceptors([credentialsInterceptor, errorInterceptor, apiInterceptor]),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
  ];
}
