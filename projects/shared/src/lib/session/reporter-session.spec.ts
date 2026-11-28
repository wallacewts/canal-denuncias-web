import { TestBed } from '@angular/core/testing';
import { ReporterSession } from './reporter-session';

describe('ReporterSession', () => {
  let session: ReporterSession;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    session = TestBed.inject(ReporterSession);
  });

  it('começa vazia', () => {
    expect(session.token()).toBeNull();
    expect(session.expiresAt()).toBeNull();
  });

  it('guarda token e expiração ao iniciar e zera ao limpar', () => {
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    session.start('token-teste', expiresAt);
    expect(session.token()).toBe('token-teste');
    expect(session.expiresAt()).toEqual(expiresAt);

    session.clear();
    expect(session.token()).toBeNull();
    expect(session.expiresAt()).toBeNull();
  });

  it('não grava nada no armazenamento do navegador nem em cookies', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const cookie = vi.spyOn(document, 'cookie', 'set');

    session.start('token-teste', new Date(Date.now() + 60_000));
    session.clear();

    expect(setItem).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
  });

  it('não expõe forma de alterar o token sem passar por start/clear', () => {
    expect('set' in session.token).toBe(false);
  });
});
