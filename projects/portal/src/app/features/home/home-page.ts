import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { PageHeader } from '@canal/shared';

/**
 * Página inicial (PINF-01): o que é o canal, o que pode ser relatado, quem pode relatar e como o anonimato é
 * protegido. Não depende da API.
 */
@Component({
  selector: 'app-home-page',
  imports: [MatButtonModule, RouterLink, PageHeader],
  template: `
    <lib-page-header
      title="Canal de Denúncias"
      subtitle="Relate vazamentos de dados e falhas de segurança de forma segura e anônima."
    />
    <div class="actions">
      <a mat-flat-button routerLink="/nova-denuncia">Fazer uma denúncia</a>
      <a mat-stroked-button routerLink="/consultar">Consultar uma denúncia</a>
    </div>

    <section>
      <h2>O que você pode relatar</h2>
      <ul>
        <li>
          <strong>Vazamento de dados:</strong> dados da empresa, de clientes ou de colaboradores
          expostos ou acessados indevidamente.
        </li>
        <li>
          <strong>Prática inadequada de segurança:</strong> senhas compartilhadas, acessos sem
          necessidade, dados enviados sem proteção.
        </li>
        <li>
          <strong>Atividade suspeita:</strong> comportamento ou acesso fora do padrão que pode
          indicar um incidente.
        </li>
      </ul>
    </section>

    <section>
      <h2>Quem pode relatar</h2>
      <ul>
        <li><strong>Colaboradores</strong> da empresa.</li>
        <li><strong>Parceiros:</strong> empresas e prestadores ligados ao negócio.</li>
        <li><strong>Terceiros:</strong> qualquer pessoa que tenha visto algo suspeito.</li>
      </ul>
    </section>

    <section>
      <h2>Como protegemos você</h2>
      <ul>
        <li>
          <strong>Sem cadastro:</strong> você recebe um protocolo e uma chave para acompanhar a
          denúncia.
        </li>
        <li><strong>Sem registro de IP:</strong> o canal não guarda de onde você acessou.</li>
        <li>
          <strong>Relato cifrado:</strong> o que você escreve é cifrado antes de ser guardado.
        </li>
        <li>
          <strong>Identidade opcional e lacrada:</strong> se quiser se identificar, sua identidade
          fica protegida e só é revelada com justificativa e aprovação de outra pessoa.
        </li>
      </ul>
      <p class="tip">
        Para mais anonimato, use um dispositivo e uma rede pessoais, e não os da empresa.
      </p>
    </section>
  `,
  styles: `
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1rem;
      margin-block: 0 2rem;
    }
    section {
      margin-block-end: 1.5rem;
      max-width: 70ch;
    }
    h2 {
      font: var(--mat-sys-title-medium);
      margin: 0 0 0.5rem;
    }
    ul {
      margin: 0;
      padding-inline-start: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .tip {
      margin-block-start: 0.75rem;
    }
  `,
})
export class HomePage {}
