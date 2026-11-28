import { bootstrapApplication } from '@angular/platform-browser';
import { loadAppConfig } from '@canal/shared';
import { App } from './app/app';
import { buildAppConfig } from './app/app.config';

loadAppConfig()
  .then((config) => bootstrapApplication(App, buildAppConfig(config)))
  // Sem console: o erro de inicialização não é registrado no navegador (FTRV-11).
  .catch(() => {
    document.body.textContent =
      'Não foi possível carregar o sistema. Tente novamente em alguns minutos.';
  });
