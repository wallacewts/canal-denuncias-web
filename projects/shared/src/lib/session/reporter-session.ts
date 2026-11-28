import { Injectable, signal } from '@angular/core';

/**
 * Credencial de acompanhamento do denunciante (PUB-01, PUB-02), SÓ em memória.
 * Nunca vai para storage, URL, título da página ou console. Recarregar a página ou abrir outra aba perde a sessão de
 * propósito: a pessoa consulta de novo com protocolo e chave. O protocolo e a chave não são guardados aqui.
 */
@Injectable({ providedIn: 'root' })
export class ReporterSession {
  private readonly tokenState = signal<string | null>(null);
  private readonly expiresAtState = signal<Date | null>(null);

  readonly token = this.tokenState.asReadonly();
  readonly expiresAt = this.expiresAtState.asReadonly();

  start(token: string, expiresAt: Date): void {
    this.tokenState.set(token);
    this.expiresAtState.set(expiresAt);
  }

  clear(): void {
    this.tokenState.set(null);
    this.expiresAtState.set(null);
  }
}
