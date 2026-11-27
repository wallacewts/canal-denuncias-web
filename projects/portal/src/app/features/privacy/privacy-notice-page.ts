import { Component } from '@angular/core';
import { PagePlaceholder } from '@canal/shared';

@Component({
  selector: 'app-privacy-notice-page',
  imports: [PagePlaceholder],
  template: `<lib-page-placeholder
    title="Aviso de privacidade"
    description="Finalidade do tratamento, base legal, prazos de retenção e direitos do titular, conforme a LGPD."
  />`,
})
export class PrivacyNoticePage {}
