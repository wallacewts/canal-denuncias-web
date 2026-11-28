import { InvalidApiResponseError, toCategories, toReceipt } from './report-submission.types';

describe('toCategories (provisório até CAT-01)', () => {
  it('aceita a lista no formato da API e mantém a ordem', () => {
    const result = toCategories([
      { code: 'B', name: 'Segunda', description: null },
      { code: 'A', name: 'Primeira', description: 'Texto' },
    ]);
    expect(result).toEqual([
      { code: 'B', name: 'Segunda', description: null },
      { code: 'A', name: 'Primeira', description: 'Texto' },
    ]);
  });

  it('ignora campos extras', () => {
    expect(toCategories([{ code: 'A', name: 'N', description: null, extra: 1 }])).toEqual([
      { code: 'A', name: 'N', description: null },
    ]);
  });

  it('aceita lista vazia', () => {
    expect(toCategories([])).toEqual([]);
  });

  it.each([
    ['não é lista', { code: 'A' }],
    ['item sem código', [{ name: 'N', description: null }]],
    ['código vazio', [{ code: '', name: 'N', description: null }]],
    ['nome com tipo errado', [{ code: 'A', name: 1, description: null }]],
    ['descrição com tipo errado', [{ code: 'A', name: 'N', description: 2 }]],
    ['item nulo', [null]],
  ])('recusa resposta malformada: %s', (_, body) => {
    expect(() => toCategories(body)).toThrow(InvalidApiResponseError);
  });
});

describe('toReceipt (provisório até REP-02)', () => {
  const VALID = { protocol: 'DV-AB12C-3DE45', accessKey: 'K', receivedOn: '2026-11-28' };

  it('aceita o comprovante no formato da API', () => {
    expect(toReceipt({ ...VALID, extra: true })).toEqual(VALID);
  });

  it.each([
    ['sem protocolo', { accessKey: 'K', receivedOn: '2026-11-28' }],
    ['chave vazia', { ...VALID, accessKey: '' }],
    ['data com hora', { ...VALID, receivedOn: '2026-11-28T10:00:00Z' }],
    ['data inválida', { ...VALID, receivedOn: '28/11/2026' }],
    ['corpo nulo', null],
    ['corpo texto', 'ok'],
  ])('recusa resposta malformada: %s', (_, body) => {
    expect(() => toReceipt(body)).toThrow(InvalidApiResponseError);
  });

  it('a mensagem do erro não repete o conteúdo recebido', () => {
    try {
      toReceipt({ ...VALID, receivedOn: 'SEGREDO' });
    } catch (error) {
      expect(String(error)).not.toContain('SEGREDO');
    }
  });
});
