import { HttpClient, HttpContext } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from '../notifications/notification.service';
import type { ApiPolicy } from './api-policy';
import { API_CALLER_HANDLES } from './error.interceptor';
import { provideApi } from './provide-api';

const SUPPORT = (id: string) => ` Código para o suporte: ${id}`;

function setup(audience: ApiPolicy['audience'], onForbidden?: ApiPolicy['onForbidden']) {
  const onUnauthenticated = vi.fn();
  const notifications = { error: vi.fn(), success: vi.fn() };
  const policy: ApiPolicy =
    audience === 'portal'
      ? { audience, withCredentials: false, bearerFor: '/public/v1/me/', onUnauthenticated }
      : { audience, withCredentials: true, bearerFor: null, onUnauthenticated, onForbidden };
  TestBed.configureTestingModule({
    providers: [
      provideApi({ apiBaseUrl: '/api' }, policy),
      provideHttpClientTesting(),
      { provide: NotificationService, useValue: notifications },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    httpTesting: TestBed.inject(HttpTestingController),
    notifications,
    onUnauthenticated,
  };
}

function fail(
  audience: ApiPolicy['audience'],
  status: number,
  body: object | string | null = null,
) {
  const ctx = setup(audience);
  const errors: unknown[] = [];
  ctx.http.get('api:/public/v1/qualquer').subscribe({ error: (e: unknown) => errors.push(e) });
  const req = ctx.httpTesting.expectOne('/api/public/v1/qualquer');
  if (status === 0)
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
  else req.flush(body, { status, statusText: 'Erro' });
  return { ...ctx, errors };
}

describe('errorInterceptor (contracts/error-messages.md)', () => {
  const consoleSpies = () => [
    vi.spyOn(console, 'error').mockImplementation(() => undefined),
    vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    vi.spyOn(console, 'log').mockImplementation(() => undefined),
  ];

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  const table: [number, string][] = [
    [0, 'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.'],
    [400, 'Alguns dados não foram aceitos. Revise os campos destacados e tente de novo.'],
    [
      403,
      'Você não tem permissão para fazer isso. Se achar que deveria ter, fale com o administrador.',
    ],
    [
      404,
      'Não encontramos o que você procurou. Ele pode ter sido removido. Volte à página anterior e tente de novo.',
    ],
    [409, 'Essa informação mudou enquanto você trabalhava. Atualize a página e tente de novo.'],
    [410, 'Este conteúdo não está mais disponível. Volte à página inicial para continuar.'],
    [429, 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.'],
    [500, 'Algo deu errado do nosso lado. Tente de novo em alguns minutos.'],
    [503, 'Algo deu errado do nosso lado. Tente de novo em alguns minutos.'],
  ];

  for (const [status, text] of table) {
    it(`status ${status}: mostra a mensagem da tabela e repassa o erro`, () => {
      const { notifications, errors } = fail('backoffice', status);
      expect(notifications.error).toHaveBeenCalledWith(text, null);
      expect(errors).toHaveLength(1);
    });
  }

  it('401 no backoffice: mensagem de sessão encerrada e ação de não autenticado', () => {
    const { notifications, onUnauthenticated } = fail('backoffice', 401);
    expect(notifications.error).toHaveBeenCalledWith(
      'Sua sessão terminou. Entre de novo para continuar.',
      null,
    );
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it('401 no portal: mensagem de acesso expirado e ação de não autenticado', () => {
    const { notifications, onUnauthenticated } = fail('portal', 401);
    expect(notifications.error).toHaveBeenCalledWith(
      'Seu acesso ao acompanhamento expirou. Informe o protocolo e a chave de novo.',
      null,
    );
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it('acrescenta o código para o suporte quando a API envia requestId', () => {
    const { notifications } = fail('backoffice', 404, {
      statusCode: 404,
      error: 'Not Found',
      message: 'x',
      requestId: 'req-9',
    });
    expect(notifications.error).toHaveBeenCalledWith(
      'Não encontramos o que você procurou. Ele pode ter sido removido. Volte à página anterior e tente de novo.' +
        SUPPORT('req-9'),
      'req-9',
    );
  });

  it('nunca exibe o message da API', () => {
    const { notifications } = fail('backoffice', 400, {
      statusCode: 400,
      error: 'Bad Request',
      message: 'relato contém texto secreto',
    });
    expect(JSON.stringify(notifications.error.mock.calls)).not.toContain('texto secreto');
  });

  it('não chama a ação de não autenticado em outros status', () => {
    const { onUnauthenticated } = fail('portal', 403);
    expect(onUnauthenticated).not.toHaveBeenCalled();
  });

  it('403 tratado pelo app (onForbidden devolve verdadeiro): sem mensagem, erro repassado', () => {
    const onForbidden = vi.fn(() => true);
    const ctx = setup('backoffice', onForbidden);
    const errors: unknown[] = [];
    ctx.http.get('api:/admin/v1/x').subscribe({ error: (e: unknown) => errors.push(e) });
    const body = { statusCode: 403, error: 'Forbidden', code: 'PASSWORD_CHANGE_REQUIRED' };
    ctx.httpTesting.expectOne('/api/admin/v1/x').flush(body, { status: 403, statusText: 'x' });
    expect(onForbidden).toHaveBeenCalledWith(body);
    expect(ctx.notifications.error).not.toHaveBeenCalled();
    expect(errors).toHaveLength(1);
  });

  it('403 que o app não trata (onForbidden devolve falso): mensagem padrão', () => {
    const ctx = setup('backoffice', () => false);
    ctx.http.get('api:/admin/v1/x').subscribe({ error: () => undefined });
    ctx.httpTesting.expectOne('/api/admin/v1/x').flush(null, { status: 403, statusText: 'x' });
    expect(ctx.notifications.error).toHaveBeenCalledTimes(1);
  });

  it('erro do servidor: não escreve nada no console', () => {
    const spies = consoleSpies();
    fail('backoffice', 500, {
      statusCode: 500,
      error: 'x',
      message: 'relato secreto',
      requestId: 'r',
    });
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it('falha de rede: não escreve nada no console', () => {
    const spies = consoleSpies();
    fail('portal', 0);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it('não interfere em chamadas sem o prefixo api:', () => {
    const { http, httpTesting, notifications } = setup('portal');
    http.get('/config.json').subscribe({ error: () => undefined });
    httpTesting.expectOne('/config.json').flush(null, { status: 500, statusText: 'Erro' });
    expect(notifications.error).not.toHaveBeenCalled();
  });
});

describe('errorInterceptor: erros tratados por quem chama (feature 003)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  it('status listado em API_CALLER_HANDLES não mostra mensagem nem roda a ação de não autenticado', () => {
    const ctx = setup('portal');
    const errors: unknown[] = [];
    ctx.http
      .post(
        'api:/public/v1/tracking/sessions',
        {},
        {
          context: new HttpContext().set(API_CALLER_HANDLES, [400, 401, 429]),
        },
      )
      .subscribe({ error: (e: unknown) => errors.push(e) });
    ctx.httpTesting
      .expectOne('/api/public/v1/tracking/sessions')
      .flush(null, { status: 401, statusText: 'Erro' });
    expect(ctx.notifications.error).not.toHaveBeenCalled();
    expect(ctx.onUnauthenticated).not.toHaveBeenCalled();
    expect(errors).toHaveLength(1);
  });

  it('status fora da lista continua com a mensagem padrão', () => {
    const ctx = setup('portal');
    ctx.http
      .post(
        'api:/public/v1/tracking/sessions',
        {},
        {
          context: new HttpContext().set(API_CALLER_HANDLES, [401]),
        },
      )
      .subscribe({ error: () => undefined });
    ctx.httpTesting
      .expectOne('/api/public/v1/tracking/sessions')
      .flush(null, { status: 500, statusText: 'Erro' });
    expect(ctx.notifications.error).toHaveBeenCalledTimes(1);
  });

  it('política com silentUnauthenticated roda a ação no 401 sem mostrar mensagem', () => {
    const onUnauthenticated = vi.fn();
    const notifications = { error: vi.fn(), success: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideApi(
          { apiBaseUrl: '/api' },
          {
            audience: 'portal',
            withCredentials: false,
            bearerFor: '/public/v1/me/',
            onUnauthenticated,
            silentUnauthenticated: true,
          },
        ),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    TestBed.inject(HttpClient)
      .get('api:/public/v1/me/report')
      .subscribe({ error: () => undefined });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/public/v1/me/report')
      .flush(null, { status: 401, statusText: 'Erro' });
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
    expect(notifications.error).not.toHaveBeenCalled();
  });
});
