import { PortalDatePipe } from './portal-date.pipe';

describe('portalDate', () => {
  const pipe = new PortalDatePipe();

  it('mostra só o dia, em dd/MM/yyyy (portal: sem hora)', () => {
    expect(pipe.transform(new Date(2026, 10, 27, 14, 5, 9))).toBe('27/11/2026');
  });

  it('aceita data em texto ISO', () => {
    const iso = new Date(2026, 0, 3, 23, 59).toISOString();
    expect(pipe.transform(iso)).toBe('03/01/2026');
  });

  it('valor vazio ou inválido vira texto vazio', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('não é data')).toBe('');
  });
});

describe('PortalDatePipe com data sem hora (AAAA-MM-DD)', () => {
  it('mostra o mesmo dia em qualquer fuso, sem voltar um dia por causa do UTC', () => {
    expect(new PortalDatePipe().transform('2026-11-28')).toBe('28/11/2026');
    expect(new PortalDatePipe().transform('2026-01-01')).toBe('01/01/2026');
  });
});
