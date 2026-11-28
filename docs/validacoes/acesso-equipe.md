# Validação: acesso da equipe ao backoffice (feature 004) e testes instáveis do portal no Firefox

Data: 2026-11-28. Ambiente: e2e no container oficial do Playwright 1.65.1 (Chromium e Firefox), build de produção com
nginx, CSP com nonce e Trusted Types, contra o servidor simulado (`tools/mock-api`). As repetições abaixo usaram
`--repeat-each` só no projeto `portal-firefox`.

## Recarregar com fonte em download (corrigido)

- **Sintoma**: `recarregar o acompanhamento encerra o acesso` (e, mais raro, o recarregar do protocolo) falhava na guarda
  de console com `downloadable font: download failed (... roboto-latin-700 ...): status=2152398850`.
- **Causa**: o status é `NS_BINDING_ABORTED`. A fonte em negrito começa a baixar quando o texto em negrito aparece; o
  `page.reload()` no meio do download faz o Firefox abortar a requisição e escrever o erro no console. É efeito do
  teste, não do app: uma fonte que falhe de verdade (404, CSP) não tem esse status.
- **Reprodução**: 2 falhas em 40 execuções do recarregar do acompanhamento.
- **Correção**: `reloadWhenSettled` (`e2e/support/reload.ts`) espera a rede ficar ociosa e `document.fonts.ready` antes
  de recarregar. Nenhum erro é engolido: a guarda de console continua valendo, e uma fonte ou chunk que falhe de
  verdade continua aparecendo. Todos os `page.reload()` dos e2e passaram a usar o utilitário (também os do backoffice,
  que esperavam só a rede).
- **Depois da correção**: 120 de 120 execuções (os dois testes de recarregar do portal, 60 vezes cada) passaram.
- **Mesmo caso com `goto`**: no backoffice, a navegação logo depois de `signInByApi` (que abre `/login`) abortou a fonte
  da tela de login uma vez. `signInByApi` agora espera as fontes terminarem (`waitForFonts`) antes de devolver. A
  primeira tentativa esperava também o `networkidle`, que no Chromium não chega depois dos `fetch` feitos pela página e
  travou 57 testes numa verificação completa; ficou só a espera das fontes. Depois: 120 de 120 execuções dos testes
  afetados (Chromium e Firefox, 20 vezes cada).

## Contraste medido no meio da troca de etapa (corrigido)

- **Sintoma**: `relato · color-contrast` no teste de acessibilidade do envio de denúncia, no Firefox, uma vez na
  verificação final.
- **Causa**: o axe rodava logo depois do "Continuar", com a transição da etapa ainda em andamento; o contraste medido
  no meio da animação não é o final (o mesmo caso já tratado no diálogo do aviso de privacidade).
- **Correção**: antes de cada análise, o teste espera o campo da etapa aparecer e as animações terminarem. A tela
  final continua sendo medida por inteiro. Depois: 30 de 30 execuções no Firefox.

## Percurso só com teclado no primeiro acesso (corrigido)

- **Sintoma**: o teste novo `primeiro acesso só com teclado` falhou uma vez no Chromium, parado na tela dos códigos.
- **Causa**: cada etapa leva o foco ao título quando abre. O teste apertava Tab antes disso; o foco voltava ao título e
  o Space não marcava "Guardei".
- **Correção**: em cada etapa, o teste espera o título estar com foco antes do Tab e confere que a caixa foi marcada.
  Depois apareceu uma segunda causa, no Chromium: com "Continuar" ainda desabilitado, o Tab passava do fim da página,
  o foco caía no `body` (cujo texto contém "Continuar") e o utilitário achava que tinha chegado ao botão. O utilitário
  passou a ignorar o `body`, e o teste espera o botão habilitar antes do Tab.
  Depois: 100 de 100 execuções (Chromium e Firefox, 25 vezes cada).

## Firefox derruba a página durante o axe (não corrigido, registrado)

- **Sintoma**: `frame.evaluate: Page crashed` no Firefox, no teste de acessibilidade do acompanhamento.
- **Reprodução**: 2 falhas em 40 execuções (`acompanhamento (awaiting)`); também acontece em
  `concluded-substantiated`. Nunca no Chromium.
- **O que foi tentado**:
  1. Hipótese da feature 003 (seção com `aria-labelledby` e campo de formulário): tirar o `aria-labelledby` da seção de
     mensagens, que tem o `textarea` de resposta. Continuou caindo (6 em 80). Revertido.
  2. Controle sem axe (só um `page.evaluate` simples na mesma tela): 0 em 60.
  3. Axe por grupo de regras, 60 execuções cada: regras ARIA 6 quedas; regras de nome acessível 3; demais regras 0. Na
     rodada seguinte, regra a regra: `aria-allowed-attr` 3; demais ARIA 1; `button-name`, `link-name` e `label` 0; o
     grupo "demais", que antes tinha dado 0, deu 5. A queda não segue uma regra: acompanha a quantidade de trabalho do
     axe na página.
  4. Um worker só (sem concorrência): 9 em 80. Não é carga nem memória (16 GB livres no host).
- **Conclusão**: queda do processo de conteúdo do Firefox 159 enquanto o axe percorre a página, sem relação com o
  código do app que conseguimos isolar. Não há sinal de defeito para quem usa o portal: a tela funciona e passa nos
  testes funcionais no Firefox.
- **Decisão**: o teste continua como está, sem repetição automática (que esconderia falha real) e sem pular no
  Firefox. A taxa observada é de cerca de 5% por execução desse teste no Firefox. Se cair na CI, rodar o job de novo e
  conferir que a falha é `Page crashed` no `AxeBuilder.analyze`; qualquer outra falha é real.
- **Acompanhar**: repetir a medição ao atualizar o Playwright (Firefox novo) ou o `@axe-core/playwright`; se a taxa
  subir ou aparecer em outra tela, reabrir a investigação.

## Acesso da equipe contra o simulador

- **Relógio**: o nginx do backoffice repassa o `Date` da API (`proxy_pass_header Date`). Sem isso, o `Date` era o do
  nginx e a correção de relógio comparava relógios diferentes; o teste das 8 horas pegou o erro. O simulador manda um
  `Date` que acompanha o relógio simulado.
- **Decisões do backend (feature 006)**, aplicadas no contrato, no simulador e nos testes: código do autenticador errado
  é `422 MFA_CODE_INVALID` (no campo, sessão mantida) e `401` é só sessão ausente ou expirada; com autenticador, o
  desafio vem antes da troca de senha exigida; `PASSWORD_SAME_AS_CURRENT`; `429` no desafio; `403
PASSWORD_CHANGE_REQUIRED` nas demais rotas enquanto a troca está pendente; `403 STEP_NOT_ALLOWED` em rota de etapa
  fora de hora.
- **Bundle inicial**: ver `specs/004-backoffice-sign-in/plan.md` (T051).

## Integração com a API real (T046 a T049, 2026-11-28)

- **Contrato**: `openapi/admin.json` da API `21df70c`, cliente gerado em `@canal/shared/api/admin`. As 12 permissões do
  `/me` cobrem todas as `data.ability` das rotas.
- **Diferenças achadas entre o simulador e a API, corrigidas no front e no simulador** (nenhuma exigiu mudar a API): o
  código de domínio vem no topo do corpo (`code`, D56), e a troca de senha só lia os itens de `message`; sair sem sessão
  responde `204` sem cookie (o simulador dava 401). Códigos novos tratados: `TOO_MANY_ATTEMPTS`, `PASSWORD_TOO_LONG`
  (mensagem da política) e `CURRENT_PASSWORD_ATTEMPTS_EXCEEDED` (429 que encerra a sessão).
- **e2e contra a API real** (`npm run e2e:api`, Chromium): passam o login com credencial inválida (mensagem genérica,
  nenhum `__Host-sid`), a tela interna sem sessão (vai ao login sem mensagem) e a proteção por origem (outra origem
  recusada com 403; a mesma escrita pela página passa). Os fluxos com usuário estão escritos e esperam uma conta de
  teste; o `create-admin` da API só aceita a senha em terminal interativo.
- **Cookie `__Host-sid`**: o Chromium **não** guarda o cookie `Secure` numa resposta HTTP, mesmo com
  `http://backoffice:8080` tratado como origem segura (o login respondia 200 com o cookie, e a chamada seguinte ia sem
  ele e recebia 401). Não é divergência da API (o contrato diz que o cookie é sempre `Secure`; produção é HTTPS). O
  `npm run e2e:api` passou a servir o backoffice por HTTPS (`backoffice-tls`, Caddy com certificado da CA interna, só no
  teste); com isso o cookie é aceito com `HttpOnly`, `Secure`, `SameSite=Strict` e `Path=/`, e muda depois do segundo
  fator.
- **Fluxos com usuário (T048)**: com uma conta criada pelo `create-admin --force`, passou o primeiro acesso completo:
  a API pede a troca de senha antes do cadastro (ordem do contrato para quem não tem autenticador), cadastro com o
  segredo da tela e TOTP calculado no teste, 10 códigos, painel com o menu das permissões do `/me`, perfil com os 422
  `PASSWORD_SAME_AS_CURRENT` e `CURRENT_PASSWORD_INVALID` no campo, troca com sucesso (volta à senha original), saída,
  código errado no campo (422 `MFA_CODE_INVALID`) e nova entrada. Credenciais só por variável de ambiente; nada delas
  no repositório nem nos artefatos.
- **Para rodar de novo**: o autenticador da conta de teste ficou cadastrado e o segredo não foi guardado. Para repetir
  o primeiro acesso, um administrador redefine o segundo fator da conta (USERS-06) ou cria outra conta de teste. Para
  rodar os testes de entrada com autenticador, informe o segredo em `E2E_API_TOTP_SECRET`.
