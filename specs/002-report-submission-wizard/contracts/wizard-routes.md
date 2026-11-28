# Contrato: rotas e comportamento do fluxo `/nova-denuncia`

## Rotas

| Rota                        | Componente                 | Título da página                          | Observação                                                                                       |
| --------------------------- | -------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/`                         | `HomePage`                 | Canal de Denúncias                        | PINF-01                                                                                          |
| `/nova-denuncia`            | `NewReportFlow` (rota-pai) | —                                         | fornece `ReportDraftState`, `ReceiptState`, `InactivityTimer`; `canDeactivate` de saída do fluxo |
| `/nova-denuncia/tipo`       | `ReporterTypeStep`         | Tipo de denunciante \| Canal de Denúncias | etapa 1 de 5                                                                                     |
| `/nova-denuncia/categoria`  | `CategoryStep`             | Categoria \| …                            | etapa 2 de 5                                                                                     |
| `/nova-denuncia/relato`     | `DescriptionStep`          | Relato \| …                               | etapa 3 de 5                                                                                     |
| `/nova-denuncia/envolvidos` | `InvolvedStep`             | Envolvidos \| …                           | etapa 4 de 5, opcional                                                                           |
| `/nova-denuncia/revisao`    | `ReviewPage`               | Revisão \| …                              | etapa 5 de 5                                                                                     |
| `/nova-denuncia/protocolo`  | `ProtocolIssuedPage`       | Protocolo gerado \| …                     | `canDeactivate` próprio                                                                          |

- `/nova-denuncia/anexos` e `/nova-denuncia/identificacao` **saem** das rotas (FR-008) e da lista `e2e/portal/routes.ts`.
- Os títulos nunca levam protocolo, chave ou trecho do relato.

## Regras

1. **Etapas puladas**: ao concluir uma navegação dentro do fluxo, se existe etapa obrigatória incompleta antes da
   pedida, navega para ela com `replaceUrl`. A tela do protocolo nunca redireciona: sem comprovante, mostra o aviso.
2. **Foco**: depois de cada troca de etapa, o foco vai para o título (`PageHeader.focus()`).
3. **Progresso**: "Etapa N de 5 · Nome", com `aria-current="step"` na etapa atual. Não aparece na tela do protocolo.
4. **Saída do fluxo** (link, botão, histórico) com rascunho preenchido: `ConfirmDialog` "Descartar o rascunho?".
   Confirmar apaga; cancelar fica.
5. **Recarregar ou fechar** com rascunho preenchido ou comprovante na memória: `beforeunload`.
6. **Envio**: botão desabilitado enquanto a requisição não volta; sucesso apaga o rascunho e navega para
   `protocolo`; erro mantém o rascunho e mostra a mensagem do `errorInterceptor` com opção de tentar de novo.
7. **Tela do protocolo**: "Concluir" só habilita depois de marcar "Guardei o protocolo e a chave"; ao concluir, apaga
   o comprovante e vai para `/`. Qualquer outra saída pede confirmação.
8. **Inatividade**: aviso aos 25 min, descarte aos 30 min (rascunho e comprovante), volta
   para `/nova-denuncia/tipo` com aviso.

## Textos que precisam existir (português)

- Tipo de denunciante: "A escolha não identifica você. Ela só ajuda a equipe a entender o contexto."
- Relato: orientação para descrever fatos e não incluir dados que identifiquem quem denuncia.
- Protocolo: "Esta é a única vez que a chave aparece. Não é possível recuperá-la."
- Inatividade (aviso): "Você está sem atividade há 25 minutos. Por segurança, o rascunho será apagado em 5 minutos."
- Inatividade (descarte): "O rascunho foi apagado depois de 30 minutos sem atividade."
