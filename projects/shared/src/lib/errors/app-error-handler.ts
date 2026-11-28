import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, type Provider, inject } from '@angular/core';
import { UNEXPECTED_ERROR_MESSAGE } from '../http/error-messages';
import { NotificationService } from '../notifications/notification.service';

/**
 * Substitui o ErrorHandler padrão do Angular, que escreve o erro no console (FTRV-02, FTRV-11).
 * Erros HTTP já foram avisados pelo errorInterceptor; os demais mostram só a mensagem genérica, sem o texto do erro.
 */
@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly notifications = inject(NotificationService);

  handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse) return;
    this.notifications.error(UNEXPECTED_ERROR_MESSAGE, null);
  }
}

export function provideAppErrorHandler(): Provider {
  return { provide: ErrorHandler, useClass: AppErrorHandler };
}
