import { StaffDateTimePipe } from './staff-date-time.pipe';

describe('staffDateTime', () => {
  const pipe = new StaffDateTimePipe();

  it('mostra data e hora exatas, em dd/MM/yyyy HH:mm:ss (backoffice, D25)', () => {
    expect(pipe.transform(new Date(2026, 10, 27, 14, 5, 9))).toBe('27/11/2026 14:05:09');
  });

  it('usa 24 horas', () => {
    expect(pipe.transform(new Date(2026, 10, 27, 23, 0, 0))).toBe('27/11/2026 23:00:00');
  });

  it('valor vazio ou inválido vira texto vazio', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform('x')).toBe('');
  });
});
