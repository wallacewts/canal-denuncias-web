# Data Model: Acompanhamento da denúncia pelo portal

Tudo vive só em memória. Nada é gravado no navegador nem enviado na URL.

## ReporterAccess (serviço raiz do portal)

| Campo        | Tipo                                    | Origem                  | Observação                                       |
| ------------ | --------------------------------------- | ----------------------- | ------------------------------------------------ |
| token        | `string \| null`                        | `ReporterSession` (lib) | Credencial do denunciante. Nunca exposta à tela. |
| expiresAt    | `Date \| null`                          | `ReporterSession` (lib) | 15 minutos depois da abertura (PUB-01).          |
| expiringSoon | `Signal<boolean>`                       | temporizador            | Verdadeiro a partir de `expiresAt − 2 min`.      |
| minutesLeft  | `Signal<number>`                        | derivado de `expiresAt` | Usado no texto do aviso.                         |
| endReason    | `Signal<'expired' \| 'logout' \| null>` | encerramento            | Lido uma vez pela tela de consulta e zerado.     |
| generation   | `number`                                | contador interno        | Respostas de outra geração são descartadas (C1). |

**Transições**

```text
sem acesso --consulta ok--> ativo --expiresAt−2min--> expirando --expiresAt--> sem acesso (mensagem "terminou")
ativo/expirando --Sair--> sem acesso (mensagem "saiu")
ativo/expirando --401--> sem acesso (mensagem "terminou")
ativo/expirando --recarga ou pageshow persistido--> sem acesso
```

Em toda transição para "sem acesso": `ReporterSession.clear()`, temporizadores cancelados, navegação para
`/consultar` com `replaceUrl`, uma única mensagem.

## TrackingAccessForm (ScreenState da tela `/consultar`)

| Campo     | Tipo     | Regra                                                            |
| --------- | -------- | ---------------------------------------------------------------- |
| protocol  | `string` | Obrigatório. Normalizado por `normalizeProtocol` antes do envio. |
| accessKey | `string` | Obrigatório. Campo oculto com botão de mostrar.                  |
| status    | enum     | `idle` · `submitting` · `failed` (mensagem genérica).            |

Limpo logo depois do sucesso, antes de navegar. Mantido depois de uma falha.

## TrackingView (ScreenState da tela `/acompanhamento`)

| Campo    | Tipo                     | Regra                                                          |
| -------- | ------------------------ | -------------------------------------------------------------- |
| report   | `TrackingReport \| null` | Carregado ao abrir; recarregado depois de enviar ou de 409.    |
| messages | `TrackingMessage[]`      | Ordem cronológica. Recarregado só por "Atualizar" e envio.     |
| reply    | `FormControl<string>`    | 1 a 5.000 caracteres; limpo depois do envio.                   |
| loading  | enum                     | `idle` · `loading` · `refreshing` · `sending` · `error`.       |
| newCount | `number`                 | Quantas mensagens novas a última atualização trouxe (anúncio). |

Zerado quando o componente é destruído (sair, expirar, 401, trocar de rota).

## TrackingReport (provisório até PUB-03 no contrato)

| Campo         | Tipo                                                                     | Observação                            |
| ------------- | ------------------------------------------------------------------------ | ------------------------------------- |
| status        | `RECEIVED` · `IN_REVIEW` · `AWAITING_REPORTER` · `CLOSED` · `CONCLUDED`  | Status público já traduzido pela API. |
| outcome       | `SUBSTANTIATED` · `PARTIALLY_SUBSTANTIATED` · `UNSUBSTANTIATED` · `null` | Só quando `CONCLUDED` (D22).          |
| replyDeadline | data `AAAA-MM-DD` · `null`                                               | Só quando `AWAITING_REPORTER` (D23).  |
| category      | `{ code, name }`                                                         | Nome exibido.                         |
| receivedOn    | data `AAAA-MM-DD`                                                        | Só a data.                            |
| timeline      | `{ on: AAAA-MM-DD, status }[]`                                           | Só datas e status públicos.           |
| canReply      | `boolean`                                                                | Proposta ao backend (research R9).    |

## TrackingMessage (provisório até MSG-02 no contrato)

| Campo  | Tipo                | Observação                                                 |
| ------ | ------------------- | ---------------------------------------------------------- |
| id     | `string`            | Identificador opaco, só para a lista.                      |
| author | `REPORTER` · `TEAM` | `TEAM` é exibido como "Equipe de apuração". Nunca há nome. |
| body   | `string`            | Texto puro, exibido por interpolação (nunca HTML).         |
| sentOn | data `AAAA-MM-DD`   | Só a data (Q2 = A; MSG-02 ajustado).                       |

## Tabela de textos

| Código                    | Texto                   |
| ------------------------- | ----------------------- |
| `RECEIVED`                | Recebida                |
| `IN_REVIEW`               | Em análise              |
| `AWAITING_REPORTER`       | Aguardando sua resposta |
| `CLOSED`                  | Encerrada               |
| `CONCLUDED`               | Concluída               |
| `SUBSTANTIATED`           | Procedente              |
| `PARTIALLY_SUBSTANTIATED` | Parcialmente procedente |
| `UNSUBSTANTIATED`         | Improcedente            |

Código desconhecido: status mostra "Em análise"; desfecho desconhecido não é exibido.
