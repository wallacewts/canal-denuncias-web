# Data Model: Envio de denúncia pelo portal

Tudo aqui vive **só em memória**, em estados com escopo do `NewReportFlow` (research.md R3). Nada é persistido no
navegador.

## ReportDraft (formulário do rascunho)

Um `FormGroup` tipado com um subgrupo por etapa (R4).

| Subgrupo       | Campo                                                      | Regra                                                                                                     | Origem          |
| -------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------- |
| `reporterType` | `type`                                                     | obrigatório; `EMPLOYEE`, `PARTNER` ou `THIRD_PARTY`                                                       | PNEW-02         |
| `category`     | `code`                                                     | obrigatório; um dos códigos recebidos da API                                                              | PNEW-03, CAT-01 |
| `content`      | `description`                                              | obrigatório; 100 a 10.000 caracteres                                                                      | PNEW-04, REP-02 |
| `content`      | `occurredOn`                                               | opcional; `{ kind: 'date', date }` (sem data futura) ou `{ kind: 'month', month, year }` (sem mês futuro) | PNEW-04         |
| `content`      | `location`, `affectedSystems`, `howKnown`, `evidenceNotes` | opcionais; até 2.000 caracteres cada                                                                      | PNEW-04, REP-02 |
| `content`      | `dataTypes`                                                | opcional; subconjunto de `PERSONAL`, `FINANCIAL`, `CREDENTIALS`, `OTHER` (provisório; levado ao REP-02)   | PNEW-04         |
| `involved`     | lista de `{ name, role }`                                  | opcional; 0 a 20 itens; cada texto até 2.000 caracteres, os dois opcionais                                | PNEW-05, REP-02 |

- **Etapa completa**: o subgrupo é válido. `involved` é sempre válido quando vazio (etapa opcional).
- **Rascunho com dados**: algum campo diferente do valor inicial. Liga o aviso de saída (R6).
- **Transições**: vazio → preenchendo → enviando → (sucesso: apagado) ou (erro: preenchendo, intacto). Inatividade
  de 30 minutos ou saída confirmada: apagado.

## ProvisionalCategory (resposta de CAT-01)

`{ code: string; name: string; description: string | null }`, só as ativas, na ordem da API. Validado em tempo de
execução (`toCategories(unknown)`). Provisório até o contrato da API ter o endpoint (R2).

## ProvisionalReportSubmission (corpo de REP-02)

Montado por `toSubmission(draft)`:

```text
reporterType, categoryCode,
description, occurredOn?, location?, affectedSystems?, dataTypes?, involved?, howKnown?, evidenceNotes?
```

- `occurredOn` vira texto: `AAAA-MM-DD` para data exata, `AAAA-MM` para mês e ano.
- Campos opcionais vazios não são enviados. Textos são enviados como digitados (sem cortar espaços internos).
- Nenhum campo de identificação (PNEW-08 fora do escopo; a API recusa com 400 antes de IDV-01).

## ProvisionalReportReceipt (resposta 201 de REP-02)

`{ protocol: string; accessKey: string; receivedOn: string }` (`receivedOn` em `AAAA-MM-DD`). Validado em tempo de
execução (`toReceipt(unknown)`).

## Receipt (estado da tela do protocolo)

| Campo                                 | Regra                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `protocol`, `accessKey`, `receivedOn` | copiados da resposta; exibidos exatamente como recebidos                 |
| `acknowledged`                        | começa `false`; a caixa "Guardei o protocolo e a chave" muda para `true` |

- **Transições**: vazio → preenchido (envio com sucesso) → apagado (saída da tela, recarga, inatividade de 30 min). Não há caminho de volta para "preenchido".

## WizardStep (tabela única de etapas)

`{ path, title, required, groupKey }` para `tipo`, `categoria`, `relato`, `envolvidos` (opcional) e `revisao`. Usada
pelo indicador de progresso ("Etapa 3 de 5"), pelo controle de etapas puladas (R5) e pelos links de edição da revisão.
