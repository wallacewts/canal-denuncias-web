import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

/** Placeholder usado pelas telas ainda não implementadas. */
@Component({
  selector: 'lib-page-placeholder',
  imports: [MatCardModule],
  template: `
    <mat-card appearance="outlined" class="placeholder">
      <mat-card-header>
        <mat-card-title>
          <h1>{{ title() }}</h1>
        </mat-card-title>
        <mat-card-subtitle>Em construção</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <p>{{ description() }}</p>
        <ng-content />
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .placeholder {
      max-width: 72ch;
    }
    h1 {
      margin: 0;
      font: inherit;
    }
  `,
})
export class PagePlaceholder {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
