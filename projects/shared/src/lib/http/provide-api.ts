import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { apiInterceptor } from './api.interceptor';

/**
 * HttpClient configurado para a API do canal.
 * O token CSRF é lido pelo próprio Angular do cookie XSRF-TOKEN e reenviado no cabeçalho X-XSRF-TOKEN
 * (só funciona com a API no mesmo domínio, que é o desenho de produção).
 */
export function provideApi(config: AppConfig): (Provider | EnvironmentProviders)[] {
  return [
    { provide: APP_CONFIG, useValue: config },
    provideHttpClient(
      withFetch(),
      withInterceptors([apiInterceptor]),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
  ];
}
