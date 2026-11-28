import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('mostra título e descrição em texto', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('title', 'Nenhuma denúncia');
    fixture.componentRef.setInput('description', 'Quando chegar uma denúncia, ela aparece aqui.');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma denúncia');
    expect(fixture.nativeElement.textContent).toContain(
      'Quando chegar uma denúncia, ela aparece aqui.',
    );
  });

  it('funciona sem descrição', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('title', 'Vazio');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent.trim()).toBe('Vazio');
  });
});
