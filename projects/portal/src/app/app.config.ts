import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { type AppConfig, provideApi, provideAppErrorHandler, provideLocale } from '@canal/shared';
import { PORTAL_API_POLICY } from './api-policy';
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
      provideApi(config, PORTAL_API_POLICY),
    ],
  };
}
