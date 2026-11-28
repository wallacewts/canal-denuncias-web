import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import {
  API_PREFIX,
  type AppConfig,
  provideApi,
  provideAppErrorHandler,
  provideLocale,
} from '@canal/shared';
import { provideAdminApiConfiguration } from '@canal/shared/api/admin';
import { BACKOFFICE_API_POLICY } from './api-policy';
import { activityInterceptor } from './features/auth/activity.interceptor';
import { routes } from './app.routes';

export function buildAppConfig(config: AppConfig): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      provideAppErrorHandler(),
      provideLocale(),
      provideRouter(
        routes,
        withComponentInputBinding(),
        withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      ),
      provideApi(config, BACKOFFICE_API_POLICY, [activityInterceptor]),
      provideAdminApiConfiguration(API_PREFIX),
    ],
  };
}
