import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from '../notifications/notification.service';
import { provideAppErrorHandler } from './app-error-handler';

describe('AppErrorHandler', () => {
  let notifications: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };
  let handler: ErrorHandler;

  beforeEach(() => {
    notifications = { error: vi.fn(), success: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideAppErrorHandler(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    handler = TestBed.inject(ErrorHandler);
  });

  afterEach(() => vi.restoreAllMocks());

  it('não escreve o erro no console', () => {
    const spies = [
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
    ];
    handler.handleError(new Error('relato secreto no erro'));
    handler.handleError(
      new HttpErrorResponse({ status: 500, error: { message: 'corpo secreto' } }),
    );
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it('erro inesperado do app: mostra a mensagem genérica, sem o texto do erro', () => {
    handler.handleError(new Error('relato secreto no erro'));
    expect(notifications.error).toHaveBeenCalledWith(
      'Algo deu errado do nosso lado. Tente de novo em alguns minutos.',
      null,
    );
  });

  it('erro HTTP já tratado pelo interceptor: não mostra outro aviso', () => {
    handler.handleError(new HttpErrorResponse({ status: 404 }));
    expect(notifications.error).not.toHaveBeenCalled();
  });
});
