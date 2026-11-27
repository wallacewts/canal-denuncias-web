import { bootstrapApplication } from '@angular/platform-browser';
import { loadAppConfig } from '@canal/shared';
import { App } from './app/app';
import { buildAppConfig } from './app/app.config';

loadAppConfig()
  .then((config) => bootstrapApplication(App, buildAppConfig(config)))
  .catch((error: unknown) => {
    console.error(error);
    document.body.textContent =
      'Não foi possível carregar o sistema. Tente novamente em alguns minutos.';
  });
