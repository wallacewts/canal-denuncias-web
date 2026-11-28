import { apiPath } from './api.interceptor';

describe('apiPath (caminho canônico das chamadas api:)', () => {
  it('chamada escrita à mão: api:/public/v1/...', () => {
    expect(apiPath('api:/public/v1/categories')).toBe('/public/v1/categories');
  });

  it('chamada do cliente gerado: os caminhos do contrato já trazem /api', () => {
    expect(apiPath('api:/api/public/v1/me/report')).toBe('/public/v1/me/report');
    expect(apiPath('api:/api/admin/v1/reports')).toBe('/admin/v1/reports');
  });

  it('sem barra depois do prefixo', () => {
    expect(apiPath('api:public/v1/x')).toBe('/public/v1/x');
  });

  it('só remove o segmento /api exato, nunca um prefixo parecido', () => {
    expect(apiPath('api:/apiary/v1')).toBe('/apiary/v1');
    expect(apiPath('api:/api')).toBe('/');
  });

  it('URL sem o prefixo api: não é chamada da API', () => {
    expect(apiPath('/config.json')).toBeNull();
    expect(apiPath('https://externo.invalid/api/x')).toBeNull();
    expect(apiPath('')).toBeNull();
  });
});
