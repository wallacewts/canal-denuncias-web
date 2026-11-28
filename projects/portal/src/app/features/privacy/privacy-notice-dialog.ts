import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { PrivacyNoticeContent } from './privacy-notice-content';

/** Aviso de privacidade aberto a partir da revisão, sem sair do fluxo e sem perder o rascunho (FR-024). */
@Component({
  selector: 'app-privacy-notice-dialog',
  imports: [MatButtonModule, MatDialogModule, PrivacyNoticeContent],
  template: `
    <h2 mat-dialog-title>Aviso de privacidade</h2>
    <mat-dialog-content><app-privacy-notice-content /></mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button type="button" mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
})
export class PrivacyNoticeDialog {}
