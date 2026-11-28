import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageHeader } from './page-header';

@Component({
  imports: [PageHeader],
  template: `<button id="antes">Antes</button
    ><lib-page-header title="Nova denúncia" subtitle="Etapa 1 de 6" />`,
})
class Host {
  readonly header = viewChild.required(PageHeader);
}

describe('PageHeader', () => {
  it('renderiza o título como h1 e o subtítulo', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const h1: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent?.trim()).toBe('Nova denúncia');
    expect(fixture.nativeElement.textContent).toContain('Etapa 1 de 6');
  });

  it('focus() move o foco para o título', async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('#antes').focus();

    fixture.componentInstance.header().focus();

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('h1'));
    fixture.nativeElement.remove();
  });

  it('o título não entra na ordem de tabulação', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1').getAttribute('tabindex')).toBe('-1');
  });
});
