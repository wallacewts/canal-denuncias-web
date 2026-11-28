import { InjectionToken } from '@angular/core';

/**
 * Política de credenciais de cada app. Fica no código do app, e não no config.json, para que não possa ser trocada por
 * configuração (data-model.md, ApiPolicy).
 */
export interface ApiPolicy {
  /** App dono da política. Define, por exemplo, o texto da mensagem de sessão expirada. */
  readonly audience: 'portal' | 'backoffice';
  /** O backoffice envia o cookie de sessão da equipe. O portal nunca envia cookies. */
  readonly withCredentials: boolean;
  /**
   * Prefixo de rota (sem o `api:`) em que o token do denunciante vai no cabeçalho `Authorization: Bearer`.
   * Portal: `/public/v1/me/`. Backoffice: `null`.
   */
  readonly bearerFor: string | null;
  /**
   * Ação quando a API responde 401. Roda num contexto de injeção, então pode usar `inject(Router)`.
   * Portal: limpar a sessão do denunciante e ir para `/consultar`. Backoffice: ir para `/login`.
   */
  readonly onUnauthenticated: () => void;
  /**
   * Quando verdadeiro, o 401 roda `onUnauthenticated` sem a mensagem padrão: o próprio app avisa a pessoa (o portal
   * mostra o motivo do encerramento na tela de consulta, feature 003). Padrão: falso.
   */
  readonly silentUnauthenticated?: boolean;
  /**
   * 403 que o app trata sozinho, decidido pelo corpo da resposta (por exemplo, o backoffice leva à troca de senha quando
   * a API exige). Devolve verdadeiro quando tratou: o interceptor não mostra a mensagem padrão e só repassa o erro. Roda
   * num contexto de injeção. Padrão: nenhum.
   */
  readonly onForbidden?: (body: unknown) => boolean;
}

export const API_POLICY = new InjectionToken<ApiPolicy>('API_POLICY');
