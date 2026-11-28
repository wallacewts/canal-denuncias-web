import { test as base, expect, type Page } from '@playwright/test';

/**
 * Guardas de privacidade usadas por TODO teste e2e (contracts/e2e-privacy-guards.md).
 * A fixture é automática: basta importar `test` deste arquivo. Ao fim de cada teste, ela confere o armazenamento do
 * navegador e reprova se alguma guarda registrou violação.
 */
export type ViolationKind = 'rede' | 'url' | 'csp' | 'armazenamento' | 'console';

export interface Violation {
  readonly kind: ViolationKind;
  readonly detail: string;
}

export interface PrivacyGuards {
  /** Registra um valor fictício que nunca pode aparecer numa URL (protocolo, chave, trecho de relato). */
  trackSensitive(value: string): void;
  /** Reprova se localStorage, sessionStorage ou IndexedDB tiverem conteúdo na página atual. */
  checkStorage(): Promise<void>;
  /** Cópia das violações registradas até agora. */
  violations(): Violation[];
  /** Devolve e limpa as violações (usado só nos testes da própria fixture). */
  takeViolations(): Violation[];
}

const CSP_MESSAGE = /Content[- ]Security[- ]Policy|Trusted Type/i;
// Falhas de rede de recursos da mesma origem não são erro do código do app (a guarda de rede cobre outras origens).
const RESOURCE_ERROR = /^Failed to load resource/;

async function readStorage(page: Page) {
  try {
    return await page.evaluate(async () => ({
      // A guarda LÊ o armazenamento para provar que está vazio; o app nunca pode usá-lo (regra do lint).
      // eslint-disable-next-line no-restricted-globals
      local: localStorage.length,
      // eslint-disable-next-line no-restricted-globals
      session: sessionStorage.length,
      indexedDb: (await indexedDB.databases()).length,
    }));
  } catch {
    // Página fechada ou about:blank, onde o armazenamento não pode ser lido: nada a conferir.
    return null;
  }
}

export const test = base.extend<{ privacyGuards: PrivacyGuards }>({
  privacyGuards: [
    async ({ page, baseURL }, use) => {
      if (!baseURL) throw new Error('privacyGuards precisa de baseURL no projeto do Playwright');
      const appOrigin = new URL(baseURL).origin;
      const sensitive: string[] = [];
      let found: Violation[] = [];
      const record = (kind: ViolationKind, detail: string) => found.push({ kind, detail });
      const checkUrl = (url: string, kind: ViolationKind) => {
        for (const value of sensitive) {
          if (url.includes(value) || url.includes(encodeURIComponent(value))) {
            record(kind, `valor sensível em ${url}`);
          }
        }
      };

      // CSP: eventos securitypolicyviolation. O script é injetado pelo protocolo de depuração, fora da CSP da página.
      await page.exposeFunction('__privacyGuardCsp', (detail: string) => record('csp', detail));
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          const report = (window as unknown as { __privacyGuardCsp: (d: string) => void })
            .__privacyGuardCsp;
          report(`${event.violatedDirective} bloqueou ${event.blockedURI || 'inline'}`);
        });
      });

      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          if (url.origin !== appOrigin) record('rede', request.url());
          checkUrl(request.url(), 'url');
        }
      });

      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) checkUrl(frame.url(), 'url');
      });

      page.on('console', (message) => {
        const text = message.text();
        if (CSP_MESSAGE.test(text)) record('csp', text);
        else if (message.type() === 'error' && !RESOURCE_ERROR.test(text)) record('console', text);
      });

      const guards: PrivacyGuards = {
        trackSensitive: (value) => void sensitive.push(value),
        checkStorage: async () => {
          const storage = await readStorage(page);
          if (storage && (storage.local || storage.session || storage.indexedDb)) {
            record('armazenamento', JSON.stringify(storage));
          }
        },
        violations: () => [...found],
        takeViolations: () => {
          const taken = found;
          found = [];
          return taken;
        },
      };

      await use(guards);

      await guards.checkStorage();
      expect(found, 'guardas de privacidade (contracts/e2e-privacy-guards.md)').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
