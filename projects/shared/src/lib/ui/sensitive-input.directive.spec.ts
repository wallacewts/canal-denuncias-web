import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SensitiveInput } from './sensitive-input.directive';

@Component({
  imports: [SensitiveInput],
  template: `
    <input id="chave" appSensitiveInput />
    <textarea id="relato" appSensitiveInput [spellcheckAllowed]="true"></textarea>
  `,
})
class Host {}

describe('SensitiveInput', () => {
  it('desliga preenchimento automático e correção ortográfica em campos de texto não livre', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#chave');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.getAttribute('spellcheck')).toBe('false');
  });

  it('em texto livre, desliga o preenchimento automático e pode manter a correção ortográfica', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('#relato');
    expect(textarea.getAttribute('autocomplete')).toBe('off');
    expect(textarea.getAttribute('spellcheck')).toBe('true');
  });
});
