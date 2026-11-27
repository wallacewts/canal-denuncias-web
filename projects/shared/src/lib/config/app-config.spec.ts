import { loadAppConfig } from './app-config';

describe('loadAppConfig', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(body: unknown, ok = true): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok, status: ok ? 200 : 404, json: async () => body })),
    );
  }

  it('remove a barra final da apiBaseUrl', async () => {
    stubFetch({ apiBaseUrl: 'https://canal.exemplo/api/' });
    await expect(loadAppConfig()).resolves.toEqual({ apiBaseUrl: 'https://canal.exemplo/api' });
  });

  it('falha quando apiBaseUrl está ausente', async () => {
    stubFetch({});
    await expect(loadAppConfig()).rejects.toThrow('apiBaseUrl é obrigatório');
  });

  it('falha quando o arquivo não existe', async () => {
    stubFetch(null, false);
    await expect(loadAppConfig()).rejects.toThrow('HTTP 404');
  });
});
