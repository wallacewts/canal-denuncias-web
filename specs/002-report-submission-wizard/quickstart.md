# Quickstart: validar o envio de denúncia pelo portal

Roteiro para provar que a feature funciona de ponta a ponta. Detalhes em [contracts/](contracts/) e
[data-model.md](data-model.md).

## Pré-requisitos

- Node.js 26, Docker com Compose e as dependências instaladas (`npm ci`).
- A API real **não** é necessária: os endpoints de categorias e envio ainda não existem (opção A).

## 1. Desenvolvimento local com o simulador

```bash
npm run dev:mock-api        # servidor simulado na porta 3000 (contracts/mock-api.md)
npm run start:portal       # ng serve; /api vai para o simulador pelo proxy.conf.json
```

Abrir `http://localhost:4200`, seguir "Fazer uma denúncia" e enviar. Esperado:

- a URL mostra só o nome da etapa;
- a tela do protocolo mostra `DV-SIMUL-ADO00` e a chave simulada;
- recarregar a tela do protocolo mostra só o aviso;
- o DevTools não mostra nada em Application → Storage nem no console.

## 2. Testes automatizados

```bash
npm run lint && npm run lint:rules
npm test
npm run build && npm run check:build   # reprova se houver sentinela do simulador no build
npm run e2e                            # fluxo completo, Chromium e Firefox, com as guardas de privacidade
```

Esperado: tudo verde. O e2e cobre o fluxo feliz, os erros de categoria e de envio, o clique duplo (um envio só no
contador do simulador), etapas puladas pela URL, os avisos de saída, o download do `.txt`, a inatividade com relógio
avançado e a acessibilidade (axe, zoom de 200% e 320 px) de todas as telas novas.

## 3. Prova de que o simulado não vai para produção

```bash
npm run test:scripts   # inclui o teste que injeta "DV-SIMUL" num build falso e espera falha
```

## 4. Quando a API publicar CAT-01 e REP-02

```bash
npm run api:sync && npm run api:generate && npm run api:check
```

Executar a tarefa bloqueada que troca os tipos provisórios pelo cliente gerado e rodar de novo os passos 2 e 3 contra
a API real (`APP_API_UPSTREAM` apontando para ela).

## 5. Validação manual (SC-001)

Uma pessoa que não conhece o sistema envia uma denúncia com descrição mínima, do início até a tela do protocolo, sem
ajuda. Esperado: menos de 5 minutos. Esse critério não é automatizável e fica registrado aqui para a revisão da equipe.
