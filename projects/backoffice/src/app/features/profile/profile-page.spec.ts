import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthApi } from '../auth/auth.api';
import type { CurrentUser } from '../auth/auth.types';
import { StaffSession } from '../auth/staff-session';
import { ProfilePage } from './profile-page';

const USER: CurrentUser = {
  id: 'u',
  name: 'Ana',
  email: 'a@x.test',
  roles: ['COMPLIANCE_MANAGER', 'AUDITOR'],
  mfaEnabledAt: new Date('2026-01-10T12:00:00Z'),
  passwordChangeRequired: false,
  abilities: [],
  idleExpiresAt: new Date('2026-11-28T12:15:00Z'),
  absoluteExpiresAt: new Date('2026-11-28T20:00:00Z'),
};

const currentInvalid = new HttpErrorResponse({
  status: 422,
  error: {
    statusCode: 422,
    error: 'x',
    message: [{ code: 'CURRENT_PASSWORD_INVALID', path: 'currentPassword', message: 'm' }],
    requestId: 'r',
  },
});

describe('ProfilePage (BPRF-01, BPRF-02)', () => {
  const changePassword = vi.fn();
  const end = vi.fn();

  function setup(user: CurrentUser | null = USER) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthApi, useValue: { changePassword } },
        { provide: StaffSession, useValue: { user: signal(user), end } },
      ],
    });
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const input = (name: string) =>
      el.querySelector(`input[formcontrolname="${name}"]`) as HTMLInputElement;
    const type = (name: string, value: string) => {
      input(name).value = value;
      input(name).dispatchEvent(new Event('input'));
    };
    const changeTo = async (current: string, next: string) => {
      type('currentPassword', current);
      type('newPassword', next);
      type('confirmPassword', next);
      el.querySelector('form')?.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const notice = () => el.querySelector('[data-testid="password-changed"]')?.textContent?.trim();
    return { el, input, changeTo, notice };
  }

  beforeEach(() => {
    changePassword.mockReset();
    end.mockReset();
  });

  it('mostra nome, e-mail, perfis e a data de ativação do segundo fator vindos da sessão', () => {
    const { el } = setup();
    const text = el.textContent ?? '';
    expect(el.querySelector('h1')?.textContent).toContain('Meu perfil');
    expect(text).toContain('Ana');
    expect(text).toContain('a@x.test');
    expect(text).toContain('Gestão de compliance, Auditoria');
    expect(text).toMatch(/10\/01\/2026 \d{2}:00:00/);
  });

  it('segundo fator sem data: texto próprio', () => {
    const { el } = setup({ ...USER, mfaEnabledAt: null });
    expect(el.textContent).toContain('Não ativado');
  });

  it('sucesso: aviso de sessão renovada e outras sessões encerradas, campos limpos', async () => {
    changePassword.mockReturnValue(of({ value: { nextStep: 'DONE' }, serverNow: null }));
    const { changeTo, notice, input } = setup();
    await changeTo('senha-atual-longa', 'nova-senha-bem-longa');
    expect(notice()).toBe(
      'Senha trocada. Sua sessão foi renovada e as outras sessões abertas foram encerradas.',
    );
    expect(input('newPassword').value).toBe('');
    expect(end).not.toHaveBeenCalled();
  });

  it('senha atual errada (422): erro no campo, sessão mantida, campos limpos e sem aviso de sucesso', async () => {
    changePassword.mockReturnValueOnce(of({ value: { nextStep: 'DONE' }, serverNow: null }));
    const { changeTo, notice, input, el } = setup();
    await changeTo('senha-atual-longa', 'nova-senha-bem-longa');
    changePassword.mockReturnValueOnce(throwError(() => currentInvalid));
    await changeTo('XQZ', 'outra-senha-bem-longa');
    expect(el.textContent).toContain('Senha atual incorreta.');
    expect(notice()).toBeUndefined();
    expect(end).not.toHaveBeenCalled();
    expect(input('currentPassword').value).toBe('');
    expect(input('newPassword').value).toBe('');
  });

  it('429 (5ª senha atual errada): encerra a sessão com a mensagem de sessão terminada', async () => {
    changePassword.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    const { changeTo } = setup();
    await changeTo('XQZ', 'nova-senha-bem-longa');
    expect(end).toHaveBeenCalledWith('unauthenticated');
  });
});
