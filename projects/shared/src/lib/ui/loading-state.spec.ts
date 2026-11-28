import { TestBed } from '@angular/core/testing';
import { LoadingState } from './loading-state';

describe('LoadingState', () => {
  it('marca a região como ocupada e tem rótulo para leitor de tela', async () => {
    const fixture = TestBed.createComponent(LoadingState);
    fixture.componentRef.setInput('label', 'Carregando denúncias');
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.getAttribute('role')).toBe('status');
    expect(host.getAttribute('aria-busy')).toBe('true');
    expect(host.textContent).toContain('Carregando denúncias');
  });
});
