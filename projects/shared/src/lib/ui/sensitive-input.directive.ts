import { Directive, input } from '@angular/core';

/**
 * Campo com dado sensível (chave do denunciante, protocolo, relato): o navegador não oferece preenchimento automático
 * nem guarda o valor no histórico de formulários (FR-037). A correção ortográfica fica desligada, exceto em texto livre
 * (`[spellcheckAllowed]="true"`, como no campo do relato).
 */
@Directive({
  selector: 'input[appSensitiveInput], textarea[appSensitiveInput]',
  host: {
    autocomplete: 'off',
    '[attr.spellcheck]': 'spellcheckAllowed() ? "true" : "false"',
  },
})
export class SensitiveInput {
  readonly spellcheckAllowed = input(false);
}
