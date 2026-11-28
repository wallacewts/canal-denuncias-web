import type { Page } from '@playwright/test';

/** O que o servidor de eco (e2e-api) recebeu: devolvido como JSON por qualquer rota fora de /fixture. */
export interface Echo {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  cookies: Record<string, string>;
}

/** Faz uma chamada a /api pelo próprio app (mesma origem) e devolve o que chegou à "API". */
export async function callApiThroughApp(
  page: Page,
  path: string,
  headers: Record<string, string> = {},
): Promise<Echo> {
  return page.evaluate(
    async ({ path, headers }) => {
      const response = await fetch(path, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as Echo;
    },
    { path, headers },
  );
}
