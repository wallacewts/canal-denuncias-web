import { Component } from '@angular/core';
import { PageHeader } from '@canal/shared';
import { PrivacyNoticeContent } from './privacy-notice-content';

@Component({
  selector: 'app-privacy-notice-page',
  imports: [PageHeader, PrivacyNoticeContent],
  template: `
    <lib-page-header title="Aviso de privacidade" />
    <app-privacy-notice-content />
  `,
})
export class PrivacyNoticePage {}
