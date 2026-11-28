// Servidor simulado da API, usado SÓ nos testes e2e (serviço e2e-api do docker-compose.e2e.yml) e no desenvolvimento
// local (npm run dev:mock-api). Nunca é importado pelos apps (regra de lint) e nada dele pode aparecer no build
// (scripts/check-build-output.mjs). Contrato: specs/002-report-submission-wizard/contracts/mock-api.md.
// - /fixture/*: páginas que violam cada guarda de privacidade, para testar a própria fixture.
// - qualquer outra rota: devolve método, caminho, cabeçalhos e cookies recebidos (testes do proxy /api)
//   e emite um cookie XSRF-TOKEN de teste.
import { randomUUID } from 'node:crypto';
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

// ---------------------------------------------------------------------------------------------------------------
// Rotas simuladas da API (CAT-01 e REP-02 do backlog da API), até elas existirem no contrato OpenAPI.
// Todo valor aqui é um sentinela (SIMULADA, DV-SIMUL): o check:build reprova o build que contiver algum deles.
// ---------------------------------------------------------------------------------------------------------------

const CATEGORIES = [
  {
    code: 'SIMULADA_VAZAMENTO',
    name: 'Vazamento de dados',
    description:
      'Dados da empresa, de clientes ou de colaboradores expostos ou acessados indevidamente.',
  },
  {
    code: 'SIMULADA_PRATICA',
    name: 'Prática inadequada de segurança',
    description:
      'Senhas compartilhadas, acessos sem necessidade, dados guardados ou enviados sem proteção.',
  },
  {
    code: 'SIMULADA_ATIVIDADE',
    name: 'Atividade suspeita',
    description: null,
  },
];

const RECEIPT = { protocol: 'DV-SIMUL-ADO00', accessKey: 'SIMULADA-K7Q2-M9XR-4TPA-W3ZN' };

const REPORTER_TYPES = ['EMPLOYEE', 'PARTNER', 'THIRD_PARTY'];
const DATA_TYPES = ['PERSONAL', 'FINANCIAL', 'CREDENTIALS', 'OTHER'];
const OPTIONAL_TEXTS = ['location', 'affectedSystems', 'howKnown', 'evidenceNotes'];
const ALLOWED_FIELDS = new Set([
  'reporterType',
  'categoryCode',
  'description',
  'occurredOn',
  'dataTypes',
  'involved',
  ...OPTIONAL_TEXTS,
]);

const DEFAULT_SCENARIO = { categories: 'ok', submit: 'ok' };

/**
 * Cenário e contador por sessão de teste (cabeçalho x-mock-session), para os testes em paralelo (Chromium e Firefox)
 * não interferirem uns nos outros. Sem o cabeçalho, vale a sessão "default" (desenvolvimento local).
 */
const sessions = new Map();
const sessionOf = (req) => {
  const id = String(req.headers['x-mock-session'] ?? 'default');
  if (!sessions.has(id)) sessions.set(id, { scenario: { ...DEFAULT_SCENARIO }, submissions: 0 });
  return sessions.get(id);
};

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
};

/** Corpo de erro no formato ApiError da API: nunca contém valores recebidos. */
const apiError = (status, error, message) => ({
  statusCode: status,
  error,
  message,
  requestId: randomUUID(),
});

const isText = (v, max) => typeof v === 'string' && v.length <= max;

/** Valida o corpo como REP-02. Devolve as issues (código e caminho), nunca o valor recebido. */
function validateSubmission(body) {
  const issues = [];
  const issue = (path, code) => issues.push({ path, code, message: `Campo inválido: ${path}` });
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    return [{ path: '', code: 'invalid_type', message: 'Corpo inválido' }];
  for (const key of Object.keys(body)) if (!ALLOWED_FIELDS.has(key)) issue(key, 'unrecognized_key');
  if (!REPORTER_TYPES.includes(body.reporterType)) issue('reporterType', 'invalid_value');
  if (
    typeof body.categoryCode !== 'string' ||
    !CATEGORIES.some((c) => c.code === body.categoryCode)
  )
    issue('categoryCode', 'invalid_value');
  if (
    typeof body.description !== 'string' ||
    body.description.length < 100 ||
    body.description.length > 10_000
  )
    issue('description', 'invalid_length');
  for (const key of OPTIONAL_TEXTS)
    if (key in body && !isText(body[key], 2_000)) issue(key, 'invalid_length');
  if (
    'occurredOn' in body &&
    !(typeof body.occurredOn === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(body.occurredOn))
  )
    issue('occurredOn', 'invalid_format');
  if (
    'dataTypes' in body &&
    !(Array.isArray(body.dataTypes) && body.dataTypes.every((t) => DATA_TYPES.includes(t)))
  )
    issue('dataTypes', 'invalid_value');
  if ('involved' in body) {
    const ok =
      Array.isArray(body.involved) &&
      body.involved.length <= 20 &&
      body.involved.every(
        (p) =>
          typeof p === 'object' &&
          p !== null &&
          Object.keys(p).every((k) => k === 'name' || k === 'role') &&
          (!('name' in p) || isText(p.name, 2_000)) &&
          (!('role' in p) || isText(p.role, 2_000)),
      );
    if (!ok) issue('involved', 'invalid_value');
  }
  return issues;
}

const readBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
  });

const today = () => new Date().toISOString().slice(0, 10);

/** Trata as rotas da API simulada e de controle. Devolve false se a rota não for dela. */
async function handleApi(req, res, url) {
  const session = sessionOf(req);
  if (url.pathname === '/__mock/reset' && req.method === 'POST') {
    session.scenario = { ...DEFAULT_SCENARIO };
    session.submissions = 0;
    res.writeHead(204);
    res.end();
    return true;
  }
  if (url.pathname === '/__mock/scenario' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      session.scenario = { ...session.scenario, ...body };
    } catch {
      return (json(res, 400, { error: 'cenário inválido' }), true);
    }
    return (json(res, 200, session.scenario), true);
  }
  if (url.pathname === '/__mock/stats' && req.method === 'GET') {
    return (json(res, 200, { submissions: session.submissions }), true);
  }

  if (url.pathname === '/api/public/v1/categories' && req.method === 'GET') {
    if (session.scenario.categories === 'error')
      return (json(res, 500, apiError(500, 'Internal Server Error', 'Erro interno.')), true);
    if (session.scenario.categories === 'empty') return (json(res, 200, []), true);
    return (json(res, 200, CATEGORIES, { 'Cache-Control': 'public, max-age=60' }), true);
  }

  if (url.pathname === '/api/public/v1/reports' && req.method === 'POST') {
    const raw = await readBody(req); // nunca registrado em log
    session.submissions += 1;
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return (json(res, 400, apiError(400, 'Bad Request', 'Corpo da requisição inválido.')), true);
    }
    if (session.scenario.submit === 'error')
      return (json(res, 500, apiError(500, 'Internal Server Error', 'Erro interno.')), true);
    const issues =
      session.scenario.submit === 'invalid'
        ? [{ path: 'description', code: 'invalid_length', message: 'Campo inválido: description' }]
        : validateSubmission(body);
    if (issues.length) return (json(res, 400, apiError(400, 'Bad Request', issues)), true);
    if (session.scenario.submit === 'slow') await new Promise((r) => setTimeout(r, 2_000));
    return (
      json(res, 201, { ...RECEIPT, receivedOn: today() }, { 'Cache-Control': 'no-store' }),
      true
    );
  }
  return false;
}

async function handle(req, res) {
  const url = new URL(req.url ?? '/', 'http://e2e-api');
  if (await handleApi(req, res, url)) return;
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
