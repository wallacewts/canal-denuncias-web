import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { AuthApi } from './auth.api';
import { PasswordChangeForm } from './password-change-form';
import { StaffSession } from './staff-session';

const unprocessable = (code: string) =>
  new HttpErrorResponse({
    status: 422,
    error: {
      statusCode: 422,
      error: 'x',
      message: [{ code, path: 'p', message: 'm' }],
      requestId: 'r',
    },
  });

describe('PasswordChangeForm (BAUTH-04, BPRF-02)', () => {
  const changePassword = vi.fn();
  const end = vi.fn();

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthApi, useValue: { changePassword } },
        { provide: StaffSession, useValue: { end } },
      ],
    });
    const fixture = TestBed.createComponent(PasswordChangeForm);
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const input = (name: string) =>
      el.querySelector(`input[formcontrolname="${name}"]`) as HTMLInputElement;
    const type = (name: string, value: string) => {
      input(name).value = value;
      input(name).dispatchEvent(new Event('input'));
    };
    const fill = (current: string, next: string, confirm = next) => {
      type('currentPassword', current);
      type('newPassword', next);
      type('confirmPassword', confirm);
    };
    const submit = async () => {
      el.querySelector('form')?.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, el, input, fill, submit, changed };
  }

  beforeEach(() => {
    changePassword.mockReset();
    end.mockReset();
  });

  it('mostra a política e valida tamanho e confirmação antes de enviar', async () => {
    const { el, fill, submit } = setup();
    expect(el.textContent).toContain('pelo menos 12 caracteres');
    fill('atual', 'X');
    await submit();
    fill('atual', '12345678901');
    await submit();
    fill('atual', 'senha-bem-longa', 'outra-senha-longa');
    await submit();
    expect(changePassword).not.toHaveBeenCalled();
    expect(el.textContent).toContain('A confirmação precisa ser igual à nova senha.');
  });

  it('envia, limpa os campos e emite a etapa seguinte', async () => {
    const step = { value: { nextStep: 'DONE' }, serverNow: null };
    changePassword.mockReturnValue(of(step));
    const { fill, submit, input, changed } = setup();
    fill('XQZ', 'nova-senha-bem-longa');
    await submit();
    expect(changePassword).toHaveBeenCalledWith('XQZ', 'nova-senha-bem-longa');
    expect(changed).toHaveBeenCalledWith(step);
    expect(input('currentPassword').value).toBe('');
    expect(input('newPassword').value).toBe('');
  });

  it('422 CURRENT_PASSWORD_INVALID vira erro no campo, sem encerrar a sessão', async () => {
    changePassword.mockReturnValue(throwError(() => unprocessable('CURRENT_PASSWORD_INVALID')));
    const { el, fill, submit, input } = setup();
    fill('XQZ', 'nova-senha-bem-longa');
    await submit();
    expect(el.textContent).toContain('Senha atual incorreta.');
    expect(end).not.toHaveBeenCalled();
    expect(input('currentPassword').value).toBe('');
  });

  it('422 da política: senha curta e senha comum com mensagens próprias', async () => {
    const { el, fill, submit } = setup();
    changePassword.mockReturnValue(throwError(() => unprocessable('PASSWORD_COMMON')));
    fill('atual', 'senhasenha123');
    await submit();
    expect(el.textContent).toContain('Essa senha é comum demais. Escolha outra.');
    changePassword.mockReturnValue(throwError(() => unprocessable('PASSWORD_TOO_SHORT')));
    fill('atual', 'senhasenha1234');
    await submit();
    expect(el.textContent).toContain('A nova senha precisa ter pelo menos 12 caracteres.');
  });

  it('422 PASSWORD_SAME_AS_CURRENT tem mensagem própria no campo da nova senha', async () => {
    const { el, fill, submit } = setup();
    changePassword.mockReturnValue(throwError(() => unprocessable('PASSWORD_SAME_AS_CURRENT')));
    fill('senha-atual-longa', 'senha-atual-longa');
    await submit();
    expect(el.textContent).toContain('A nova senha precisa ser diferente da atual.');
    expect(end).not.toHaveBeenCalled();
  });

  it('429 (5 erros de senha atual) encerra a sessão pelo StaffSession', async () => {
    changePassword.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    const { fill, submit } = setup();
    fill('XQZ', 'nova-senha-bem-longa');
    await submit();
    expect(end).toHaveBeenCalledWith('unauthenticated');
  });

  it('clique duplo faz uma única chamada', async () => {
    changePassword.mockReturnValue(NEVER);
    const { fill, submit } = setup();
    fill('atual', 'nova-senha-bem-longa');
    await submit();
    fill('atual', 'nova-senha-bem-longa');
    await submit();
    expect(changePassword).toHaveBeenCalledTimes(1);
  });
});
