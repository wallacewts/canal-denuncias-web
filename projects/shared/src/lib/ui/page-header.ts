import { Component, type ElementRef, input, viewChild } from '@angular/core';

/**
 * Título da página (h1). `focus()` move o foco para o título, por exemplo quando o wizard troca de etapa, para o leitor
 * de tela anunciar onde a pessoa está. O título fica fora da ordem de tabulação (tabindex="-1").
 */
@Component({
  selector: 'lib-page-header',
  template: `
    <header class="page-header">
      <h1 #heading tabindex="-1">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="subtitle">{{ subtitle() }}</p>
      }
    </header>
  `,
  styles: `
    .page-header {
      margin-block-end: 1.5rem;
    }
    h1 {
      margin: 0;
      font: var(--mat-sys-headline-small);
      overflow-wrap: anywhere;
    }
    .subtitle {
      margin: 0.25rem 0 0;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');

  focus(): void {
    this.heading().nativeElement.focus();
  }
}
