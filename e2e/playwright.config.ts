import { defineConfig, devices } from '@playwright/test';

/**
 * Roda SEMPRE dentro do container oficial do Playwright (npm run e2e), na rede do docker-compose.e2e.yml.
 * O host (Ubuntu 20.04) não precisa suportar o Playwright.
 *
 * Nunca use bypassCSP: a CSP real dos apps é justamente o que está sendo testado.
 */
const areas = {
  fixture: { testDir: './fixtures', baseURL: 'http://e2e-api:3000' },
  portal: { testDir: './portal', baseURL: 'http://portal:8080' },
  backoffice: { testDir: './backoffice', baseURL: 'http://backoffice:8080' },
} as const;

/**
 * Em produção os apps rodam em HTTPS. Na rede do e2e as origens são http://portal:8080 e http://backoffice:8080, e o
 * Chromium ignoraria cabeçalhos que exigem origem confiável (como o Cross-Origin-Opener-Policy), com aviso no console.
 * Tratar essas origens como seguras faz o navegador aplicar os cabeçalhos como em produção. Isso não muda a CSP.
 */
const TEST_ORIGINS = 'http://portal:8080,http://backoffice:8080,http://e2e-api:3000';

const browsers = {
  chromium: {
    ...devices['Desktop Chrome'],
    launchOptions: { args: [`--unsafely-treat-insecure-origin-as-secure=${TEST_ORIGINS}`] },
  },
  firefox: devices['Desktop Firefox'],
} as const;

export default defineConfig({
  outputDir: './test-results',
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: './report', open: 'never' }]],
  use: {
    bypassCSP: false,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: Object.entries(areas).flatMap(([area, { testDir, baseURL }]) =>
    Object.entries(browsers).map(([browser, device]) => ({
      name: `${area}-${browser}`,
      testDir,
      use: { ...device, baseURL },
    })),
  ),
});
