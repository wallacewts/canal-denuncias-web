import { toApiError } from './api-error';

describe('toApiError', () => {
  it('lê o corpo padrão da API (TRV-01)', () => {
    const body = {
      statusCode: 409,
      error: 'Conflict',
      message: 'detalhe técnico',
      requestId: 'req-123',
    };
    expect(toApiError(409, body)).toEqual({
      statusCode: 409,
      error: 'Conflict',
      requestId: 'req-123',
    });
  });

  it('nunca guarda o texto de message vindo da API', () => {
    const parsed = toApiError(400, {
      statusCode: 400,
      error: 'Bad Request',
      message: 'relato: texto secreto',
    });
    expect(JSON.stringify(parsed)).not.toContain('texto secreto');
  });

  it('trata resposta sem corpo', () => {
    expect(toApiError(500, null)).toEqual({ statusCode: 500, error: null, requestId: null });
  });

  it('trata corpo fora do formato', () => {
    expect(toApiError(502, '<html>Bad Gateway</html>')).toEqual({
      statusCode: 502,
      error: null,
      requestId: null,
    });
    expect(toApiError(404, { requestId: 42, error: ['x'] })).toEqual({
      statusCode: 404,
      error: null,
      requestId: null,
    });
  });

  it('trata falha de rede (status 0)', () => {
    expect(toApiError(0, new ProgressEvent('error'))).toEqual({
      statusCode: 0,
      error: null,
      requestId: null,
    });
  });
});
