import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FieldErrorLink, FormFieldError } from './form-field-error';

@Component({
  imports: [ReactiveFormsModule, FormFieldError, FieldErrorLink],
  template: `
    <label for="relato">Relato</label>
    <textarea id="relato" [formControl]="relato" [libFieldError]="erro"></textarea>
    <lib-form-field-error #erro [control]="relato" [messages]="messages" />
  `,
})
class Host {
  readonly relato = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly messages = { required: 'Descreva o que aconteceu.' };
}

describe('FormFieldError', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const field: HTMLTextAreaElement = fixture.nativeElement.querySelector('#relato');
    const region: HTMLElement = fixture.nativeElement.querySelector(
      'lib-form-field-error [aria-live]',
    );
    return { fixture, field, region };
  }

  it('não mostra erro nem liga o campo antes de a pessoa interagir', async () => {
    const { field, region } = await setup();
    expect(field.hasAttribute('aria-describedby')).toBe(false);
    expect(region.textContent?.trim()).toBe('');
  });

  it('a região de aviso existe desde o início e é educada', async () => {
    const { region } = await setup();
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('com erro: mostra a mensagem, liga o campo por aria-describedby e marca aria-invalid', async () => {
    const { fixture, field, region } = await setup();
    fixture.componentInstance.relato.markAsTouched();
    fixture.componentInstance.relato.setValue('');
    await fixture.whenStable();

    expect(region.textContent?.trim()).toBe('Descreva o que aconteceu.');
    expect(field.getAttribute('aria-describedby')).toBe(region.id);
    expect(region.id).not.toBe('');
    expect(field.getAttribute('aria-invalid')).toBe('true');
  });

  it('ao corrigir: tira a mensagem e o vínculo', async () => {
    const { fixture, field, region } = await setup();
    fixture.componentInstance.relato.markAsTouched();
    fixture.componentInstance.relato.setValue('');
    await fixture.whenStable();

    fixture.componentInstance.relato.setValue('a');
    await fixture.whenStable();

    expect(region.textContent?.trim()).toBe('');
    expect(field.hasAttribute('aria-describedby')).toBe(false);
    expect(field.hasAttribute('aria-invalid')).toBe(false);
  });
});
