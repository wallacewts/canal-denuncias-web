import { Component, inject, signal } from '@angular/core';
import { PageHeader, StaffDateTimePipe } from '@canal/shared';
import type { Role } from '../auth/auth.types';
import { PasswordChangeForm } from '../auth/password-change-form';
import { StaffSession } from '../auth/staff-session';

/** Nomes dos perfis para exibição (os cinco perfis do USERS). Menu e rotas não usam perfis, só permissões (Q1). */
const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administração',
  COMPLIANCE_MANAGER: 'Gestão de compliance',
  ANALYST: 'Análise',
  DPO: 'Encarregado de dados (DPO)',
  AUDITOR: 'Auditoria',
};

/**
 * Meu perfil (BPRF-01, BPRF-02). Os dados vêm do `StaffSession` (carregados do `/me` ao entrar, só em memória). A troca
 * de senha reaproveita o formulário do primeiro acesso; depois do sucesso a API renova a sessão (cookie novo) e encerra
 * as outras sessões da pessoa.
 */
@Component({
  selector: 'app-profile-page',
  imports: [PageHeader, PasswordChangeForm, StaffDateTimePipe],
  template: `
    <lib-page-header title="Meu perfil" subtitle="Seus dados de acesso e a troca de senha." />
    @if (session.user(); as user) {
      <section aria-labelledby="dados">
        <h2 id="dados">Seus dados</h2>
        <dl data-testid="profile-data">
          <dt>Nome</dt>
          <dd>{{ user.name }}</dd>
          <dt>E-mail</dt>
          <dd>{{ user.email }}</dd>
          <dt>Perfis</dt>
          <dd>{{ roles(user.roles) }}</dd>
          <dt>Segundo fator ativado em</dt>
          <dd>{{ user.mfaEnabledAt ? (user.mfaEnabledAt | staffDateTime) : 'Não ativado' }}</dd>
        </dl>
      </section>
    }
    <section aria-labelledby="senha">
      <h2 id="senha">Trocar senha</h2>
      <p role="status" class="notice">
        @if (changed()) {
          <span data-testid="password-changed">
            Senha trocada. Sua sessão foi renovada e as outras sessões abertas foram encerradas.
          </span>
        }
      </p>
      <app-password-change-form (started)="changed.set(false)" (changed)="changed.set(true)" />
    </section>
  `,
  styles: `
    dl {
      display: grid;
      grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
      gap: 0.5rem 1.5rem;
      margin: 0 0 2rem;
    }
    dt {
      font-weight: 500;
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    @media (max-width: 599.98px) {
      dl {
        grid-template-columns: minmax(0, 1fr);
      }
      dd {
        margin-bottom: 0.5rem;
      }
    }
    .notice:empty {
      margin: 0;
    }
  `,
})
export class ProfilePage {
  protected readonly session = inject(StaffSession);
  protected readonly changed = signal(false);

  protected roles(roles: readonly Role[]): string {
    return roles.map((role) => ROLE_LABELS[role] ?? role).join(', ');
  }
}
