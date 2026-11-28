import { Component, Injectable, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { map, type Observable } from 'rxjs';

export interface ConfirmOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
}

@Component({
  selector: 'lib-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">{{ data.cancelLabel }}</button>
      <button mat-flat-button type="button" [mat-dialog-close]="true">
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogContent {
  protected readonly data = inject<ConfirmOptions>(MAT_DIALOG_DATA);
}

/**
 * Confirmação do próprio app, no lugar de `window.confirm` (FR-027). Devolve `true` só quando a pessoa confirma;
 * cancelar, fechar com Esc ou clicar fora devolve `false`.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialog {
  private readonly dialog = inject(MatDialog);

  open(options: ConfirmOptions): Observable<boolean> {
    return this.dialog
      .open<ConfirmDialogContent, ConfirmOptions, boolean>(ConfirmDialogContent, {
        data: options,
        role: 'alertdialog',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .pipe(map((result) => result === true));
  }
}
