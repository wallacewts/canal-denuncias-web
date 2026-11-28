import { TestBed } from '@angular/core/testing';
import { STATUS_TONES, StatusChip } from './status-chip';

describe('StatusChip', () => {
  for (const tone of STATUS_TONES) {
    it(`tom ${tone}: o significado está no texto, não só na cor`, async () => {
      const fixture = TestBed.createComponent(StatusChip);
      fixture.componentRef.setInput('label', 'Em análise');
      fixture.componentRef.setInput('tone', tone);
      await fixture.whenStable();
      const host: HTMLElement = fixture.nativeElement;
      expect(host.textContent?.trim()).toBe('Em análise');
      expect(host.classList).toContain(`tone-${tone}`);
      expect(host.getAttribute('style')).toBeNull();
    });
  }

  it('usa o tom neutro por padrão', async () => {
    const fixture = TestBed.createComponent(StatusChip);
    fixture.componentRef.setInput('label', 'Recebida');
    await fixture.whenStable();
    expect(fixture.nativeElement.classList).toContain('tone-neutral');
  });
});
