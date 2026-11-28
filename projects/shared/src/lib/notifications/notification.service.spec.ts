import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let announce: ReturnType<typeof vi.fn>;
  let open: ReturnType<typeof vi.fn>;
  let service: NotificationService;

  beforeEach(() => {
    announce = vi.fn().mockResolvedValue(undefined);
    open = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: LiveAnnouncer, useValue: { announce } },
        { provide: MatSnackBar, useValue: { open } },
      ],
    });
    service = TestBed.inject(NotificationService);
  });

  it('erro: mostra o aviso e anuncia de forma assertiva', async () => {
    service.error('Algo deu errado.', 'req-1');
    await vi.waitFor(() => expect(open).toHaveBeenCalled());
    expect(open).toHaveBeenCalledWith(
      'Algo deu errado.',
      'Fechar',
      expect.objectContaining({ politeness: 'off' }),
    );
    expect(announce).toHaveBeenCalledWith('Algo deu errado.', 'assertive');
  });

  it('o anúncio ao leitor de tela não espera o snackbar carregar', async () => {
    service.error('Sem conexão.');
    expect(announce).toHaveBeenCalledWith('Sem conexão.', 'assertive');
    expect(open).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(open).toHaveBeenCalled());
  });

  it('sucesso: mostra o aviso e anuncia de forma educada', async () => {
    service.success('Mensagem enviada.');
    await vi.waitFor(() => expect(open).toHaveBeenCalled());
    expect(open).toHaveBeenCalledWith(
      'Mensagem enviada.',
      'Fechar',
      expect.objectContaining({ politeness: 'off' }),
    );
    expect(announce).toHaveBeenCalledWith('Mensagem enviada.', 'polite');
  });
});
