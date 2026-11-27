import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-settings-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Configurações"
    description="Categorias, prazos de SLA e políticas de retenção."
  />`,
})
export class SettingsPage {}
