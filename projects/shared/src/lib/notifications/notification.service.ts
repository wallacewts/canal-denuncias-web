import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Injectable, Injector, inject } from '@angular/core';
import type { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Avisos para a pessoa. O texto é anunciado na hora pelo LiveAnnouncer e aparece num snackbar, que fica com
 * `politeness: 'off'` para o leitor de tela não ler duas vezes. Erros são assertivos; confirmações, educadas.
 *
 * O snackbar (e o overlay do Material) só é carregado no primeiro aviso. Este serviço é criado na inicialização pelo
 * AppErrorHandler, e carregá-lo antes aumentaria o bundle inicial do portal (orçamento de 400 kB, princípio VII).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly announcer = inject(LiveAnnouncer);
  private readonly injector = inject(Injector);
  private snackBar?: Promise<MatSnackBar>;

  /** `requestId` já vem incluído no texto pelo tratamento de erros; fica no contrato para uso futuro (suporte). */
  error(text: string, requestId: string | null = null): void {
    void requestId;
    this.show(text, 'assertive', 10_000);
  }

  success(text: string): void {
    this.show(text, 'polite', 5_000);
  }

  private show(text: string, politeness: 'assertive' | 'polite', duration: number): void {
    void this.announcer.announce(text, politeness);
    void this.loadSnackBar().then((snackBar) =>
      snackBar.open(text, 'Fechar', { politeness: 'off', duration }),
    );
  }

  private loadSnackBar(): Promise<MatSnackBar> {
    this.snackBar ??= import('@angular/material/snack-bar').then((m) =>
      this.injector.get(m.MatSnackBar),
    );
    return this.snackBar;
  }
}
