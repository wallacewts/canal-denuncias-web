// Servidor simulado da API, usado SÓ nos testes e2e (serviço e2e-api do docker-compose.e2e.yml) e no desenvolvimento
// local (npm run dev:mock-api). Nunca é importado pelos apps (regra de lint) e nada dele pode aparecer no build
// (scripts/check-build-output.mjs). Contrato: specs/002-report-submission-wizard/contracts/mock-api.md.
// - /fixture/*: páginas que violam cada guarda de privacidade, para testar a própria fixture.
// - qualquer outra rota: devolve método, caminho, cabeçalhos e cookies recebidos (testes do proxy /api)
//   e emite um cookie XSRF-TOKEN de teste.
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const html = (title, body, script) =>
  `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title></head>` +
  `<body><h1>${title}</h1>${body}${script ? `<script src="/fixture/${script}.js"></script>` : ''}</body></html>`;

// CSP das páginas de teste: só a própria origem. A página "external" libera connect-src para que a requisição
// externa chegue a ser feita (e o teste prove que a guarda de rede a detecta).
const CSP_SELF = "default-src 'self'";
const CSP_EXTERNAL = "default-src 'self'; connect-src *";

const pages = {
  clean: { csp: CSP_SELF, page: html('Página limpa', '<p>Sem violações.</p>') },
  external: { csp: CSP_EXTERNAL, page: html('Requisição externa', '', 'external') },
  url: { csp: CSP_SELF, page: html('Valor na URL', '', 'url') },
  // Script inline bloqueado pela CSP: gera o evento securitypolicyviolation.
  csp: {
    csp: CSP_SELF,
    page: html('Violação de CSP', '<script>document.title = "inline";</script>'),
  },
  storage: { csp: CSP_SELF, page: html('Armazenamento', '', 'storage') },
  console: { csp: CSP_SELF, page: html('Console', '', 'console') },
};

const scripts = {
  external: "fetch('http://externo.invalid/rastreio').catch(() => undefined);",
  url: "history.pushState({}, '', '/fixture/url?protocolo=DV-TESTE-SEGREDO');",
  storage: "localStorage.setItem('rastro', 'denuncia');",
  console: "console.error('falha simulada do app');",
};

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => [c.slice(0, c.indexOf('=')), c.slice(c.indexOf('=') + 1)]),
  );
}

function handle(req, res) {
  const url = new URL(req.url ?? '/', 'http://e2e-api');
  const fixture = url.pathname.match(/^\/fixture\/(\w+)(\.js)?$/);

  if (fixture && fixture[2] && scripts[fixture[1]]) {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    res.end(scripts[fixture[1]]);
    return;
  }
  if (fixture && !fixture[2] && pages[fixture[1]]) {
    const { csp, page } = pages[fixture[1]];
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': csp,
    });
    res.end(page);
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Set-Cookie': 'XSRF-TOKEN=token-de-teste; Path=/; SameSite=Strict',
  });
  res.end(
    JSON.stringify({
      method: req.method,
      path: url.pathname,
      headers: req.headers,
      cookies: parseCookies(req.headers.cookie),
    }),
  );
}

/** Cria o servidor sem começar a escutar (os testes escolhem a porta). */
export function createMockApi() {
  return createServer(handle);
}

// Executado diretamente (node server.mjs): escuta na porta 3000, a do proxy.conf.json e do upstream dos e2e.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  createMockApi().listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
