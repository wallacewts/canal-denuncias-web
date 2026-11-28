import { normalizeProtocol } from './normalize-protocol';

describe('normalizeProtocol (PACC-02)', () => {
  it.each([
    ['DV-SIMUL-ADO00', 'DV-SIMUL-ADO00'],
    ['dv-simul-ado00', 'DV-SIMUL-ADO00'],
    ['dvsimulado00', 'DV-SIMUL-ADO00'],
    ['  DV SIMUL ADO00  ', 'DV-SIMUL-ADO00'],
    ['DVSIM-ULADO-00', 'DV-SIMUL-ADO00'],
    ['d v-s i m u l-a d o 0 0', 'DV-SIMUL-ADO00'],
  ])('normaliza %j para o formato DV-XXXXX-XXXXX', (raw, expected) => {
    expect(normalizeProtocol(raw)).toBe(expected);
  });

  it.each([
    ['', ''],
    ['x', 'X'],
    ['dv-abc', 'DVABC'],
    ['AB-12345-67890', 'AB1234567890'],
  ])('fora do formato devolve o texto limpo sem lançar (%j)', (raw, expected) => {
    expect(normalizeProtocol(raw)).toBe(expected);
  });
});
