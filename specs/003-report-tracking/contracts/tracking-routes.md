# Contrato: rotas e comportamento das telas de acompanhamento

| Rota              | Título da página (aba)                  | Guard / regra                                                                |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| `/consultar`      | Consultar denúncia · Canal de Denúncias | Pública. Mostra a mensagem de encerramento, se houver.                       |
| `/acompanhamento` | Acompanhamento · Canal de Denúncias     | `canActivate`: sem credencial → `/consultar` (troca a entrada do histórico). |

- Nenhum parâmetro de rota nem query string. Dados na URL colada são ignorados.
- O título nunca contém protocolo, status ou qualquer dado da denúncia.

## `/consultar`

- Campos: "Protocolo" (texto, `autocomplete="off"`, `autocapitalize="characters"`) e "Chave de acesso" (`type="password"`,
  `autocomplete="off"`), com botão "Mostrar chave"/"Ocultar chave" (`aria-pressed`, `aria-controls`).
- Botão "Consultar". Durante a requisição: desabilitado, e a região de status diz "Consultando…".
- Falha (401, 400, 429): "Protocolo ou chave inválidos." em `role="alert"`, ligada ao formulário; campos mantidos.
- Rede/5xx: mensagem padrão da base compartilhada.
- Sucesso: campos limpos, `ReporterAccess.open`, navegação para `/acompanhamento`, foco no `h1`.
- Orientação visível: "Use um dispositivo pessoal. Não salve a chave no navegador. Ao terminar, clique em Sair e feche a
  aba."
- Mensagens de encerramento (vindas do `ReporterAccess`): "Seu acesso terminou. Informe o protocolo e a chave de
  novo." ou "Você saiu do acompanhamento.", em `role="status"`.

## `/acompanhamento`

Ordem dos blocos:

1. `h1` "Acompanhamento da denúncia" (recebe o foco) e botão "Sair" visível no topo.
2. Faixa de expiração (`role="alert"`), só quando `expiringSoon`: "Seu acesso termina em N minutos. O texto que você
   ainda não enviou será perdido."
3. Andamento: status em texto (com indicação visual que não depende só de cor), desfecho quando concluída, categoria,
   data de recebimento.
4. Prazo, só em `AWAITING_REPORTER`: "Responda até DD/MM/AAAA" (ou "Prazo vencido em DD/MM/AAAA"), com o botão
   "Responder agora", que move o foco para o campo de mensagem.
5. Linha do tempo: lista com data e status público, sem hora.
6. Mensagens: lista (`ol`) em ordem cronológica, cada item com autor ("Você" ou "Equipe de apuração") e data. Botão
   "Atualizar". Região `aria-live="polite"` com "N mensagens novas" ou "Nenhuma mensagem nova".
7. Resposta, só quando `canReply`: campo de texto com rótulo, contador "Restam N caracteres", erro ligado ao campo
   (`FormFieldError`), botão "Enviar mensagem". Quando não puder responder: "Esta denúncia foi encerrada. Você ainda pode
   ler as mensagens, mas não pode enviar novas."
8. Orientações para computador compartilhado e o botão "Sair" de novo no fim da tela.

- Sair, expirar ou 401: dados apagados, navegação para `/consultar` com `replaceUrl`.
- Lista vazia: "Ainda não há mensagens." e, se puder responder, "Use o campo abaixo para escrever à equipe de apuração."
