import {
  Component,
  Directive,
  computed,
  inject,
  input,
  type OnInit,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { AbstractControl } from '@angular/forms';

let nextId = 0;

/**
 * Mensagem de erro de um campo (FR-023). A região `aria-live="polite"` existe desde o início, para o leitor de tela
 * anunciar a mensagem quando ela aparece. A mensagem só aparece depois que a pessoa interage com o campo.
 *
 * Uso:
 *   <textarea [formControl]="relato" [libFieldError]="erro"></textarea>
 *   <lib-form-field-error #erro [control]="relato" [messages]="{ required: 'Descreva o que aconteceu.' }" />
 */
@Component({
  selector: 'lib-form-field-error',
  template: `<div class="message" [id]="id" aria-live="polite">{{ message() }}</div>`,
  styles: `
    .message {
      min-height: 1.25rem;
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class FormFieldError implements OnInit {
  readonly control = input.required<AbstractControl>();
  /** Texto por chave de erro do validador (ex.: `required`). Erros sem texto mostram a mensagem padrão. */
  readonly messages = input<Readonly<Record<string, string>>>({});
  readonly id = `lib-field-error-${nextId++}`;

  private readonly destroyRef = inject(DestroyRef);
  private readonly revision = signal(0);

  /** Mensagem atual, ou texto vazio quando não há erro a mostrar. */
  readonly message = computed(() => {
    this.revision();
    const control = this.control();
    if (!control.invalid || !(control.touched || control.dirty) || !control.errors) return '';
    const key = Object.keys(control.errors)[0];
    return this.messages()[key] ?? 'Revise este campo.';
  });

  readonly visible = computed(() => this.message() !== '');

  ngOnInit(): void {
    this.control()
      .events.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.revision.update((n) => n + 1));
  }
}

/** Liga o campo à mensagem de erro por `aria-describedby` e marca `aria-invalid` enquanto o erro estiver visível. */
@Directive({
  selector: '[libFieldError]',
  host: {
    '[attr.aria-describedby]': 'libFieldError().visible() ? libFieldError().id : null',
    '[attr.aria-invalid]': 'libFieldError().visible() ? "true" : null',
  },
})
export class FieldErrorLink {
  readonly libFieldError = input.required<FormFieldError>();
}
