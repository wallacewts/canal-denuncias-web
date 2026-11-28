import { Component } from '@angular/core';

/**
 * Texto do aviso de privacidade, usado pela página /privacidade e pelo diálogo da revisão (feature 002, research
 * R10). O texto final ainda precisa ser validado pelo jurídico e pelo DPO.
 */
@Component({
  selector: 'app-privacy-notice-content',
  template: `
    <h2>Para que usamos os dados</h2>
    <p>
      Só para apurar o incidente relatado. Os dados não são usados para nenhuma outra finalidade.
    </p>
    <h2>O que coletamos</h2>
    <p>
      Só o que você escreve no formulário. Não pedimos cadastro, não registramos o seu endereço IP e
      não usamos cookies nem ferramentas de terceiros.
    </p>
    <h2>Como protegemos</h2>
    <p>
      O relato é cifrado antes de ser guardado. Só a equipe responsável pela apuração tem acesso, e
      cada acesso fica registrado.
    </p>
    <h2>Por quanto tempo guardamos</h2>
    <p>
      Pelo prazo definido pela empresa para cada tipo de desfecho. Depois disso, o relato é apagado.
    </p>
    <h2>Seus direitos</h2>
    <p>
      Como o canal não identifica quem denuncia, o acompanhamento é feito só com o protocolo e a
      chave que você recebe ao enviar.
    </p>
  `,
  styles: `
    h2 {
      font: var(--mat-sys-title-medium);
      margin: 1.25rem 0 0.25rem;
    }
    p {
      margin: 0;
      max-width: 65ch;
    }
  `,
})
export class PrivacyNoticeContent {}
