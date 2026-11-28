# Contrato: mensagens de erro (FTRV-02)

Uma única tabela, usada pelos dois apps. As mensagens dizem o que aconteceu e o que fazer (constituição, princípio IV).
Quando a API envia `requestId`, a mensagem termina com "Código para o suporte: {requestId}".

| Status | Situação                   | Mensagem                                                                                                                                            | Ação extra                                                              |
| ------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 0      | Sem rede ou API fora do ar | Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.                                                                       | —                                                                       |
| 400    | Dados inválidos            | Alguns dados não foram aceitos. Revise os campos destacados e tente de novo.                                                                        | A tela trata os detalhes de campo.                                      |
| 401    | Não autenticado            | Backoffice: Sua sessão terminou. Entre de novo para continuar. Portal: Seu acesso ao acompanhamento expirou. Informe o protocolo e a chave de novo. | Backoffice → `/login`. Portal → limpa `ReporterSession` → `/consultar`. |
| 403    | Sem permissão              | Você não tem permissão para fazer isso. Se achar que deveria ter, fale com o administrador.                                                         | —                                                                       |
| 404    | Não encontrado             | Não encontramos o que você procurou. Ele pode ter sido removido.                                                                                    | —                                                                       |
| 409    | Conflito                   | Essa informação mudou enquanto você trabalhava. Atualize a página e tente de novo.                                                                  | —                                                                       |
| 410    | Não está mais disponível   | Este conteúdo não está mais disponível.                                                                                                             | —                                                                       |
| 429    | Muitas tentativas          | Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.                                                                           | —                                                                       |
| 5xx    | Erro inesperado            | Algo deu errado do nosso lado. Tente de novo em alguns minutos.                                                                                     | —                                                                       |

Regras:

- O texto de `message` vindo da API não é exibido (pode ser técnico). A exceção é o 400 com detalhes de campo, que a tela
  traduz.
- Nenhum corpo de requisição ou resposta e nenhum objeto `HttpErrorResponse` é escrito no console.
- Cada linha da tabela tem teste unitário (FR-009).
