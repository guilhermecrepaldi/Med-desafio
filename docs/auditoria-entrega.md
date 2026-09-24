# Auditoria de entrega

## Propósito

Esta matriz transforma o enunciado em evidências revisáveis. A fonte de
verdade funcional é [desafio.md](desafio.md). Um item só é marcado como
**PASS executado** quando o comando correspondente foi realmente concluído
neste ambiente; código versionado ou teste escrito não substitui execução.

## Validado agora

| Evidência                                                       | Resultado local | Observação                                                                                                                                                                                                  |
| --------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                        | PASS executado  | Instalação limpa das dependências; `npm audit --omit=dev` não encontrou vulnerabilidades.                                                                                                                   |
| `npm run lint`                                                  | PASS executado  | Sem warnings.                                                                                                                                                                                               |
| `npm run format:check`                                          | PASS executado  | Prettier.                                                                                                                                                                                                   |
| `npm test`                                                      | PASS executado  | 4 suítes, 10 testes unitários.                                                                                                                                                                              |
| `npm run build` e `npx tsc --noEmit -p tsconfig.json`           | PASS executado  | Build NestJS e tipos, incluindo a suíte E2E.                                                                                                                                                                |
| migration e entidades                                           | PASS executado  | PostgreSQL vazio criado por Compose, migration aplicada; `npm run migration:show` exibiu `[X] InitialSchema1710000000000`. PKs, FKs, `UNIQUE`, índices, `NOT NULL` e `RESTRICT` foram consultados no banco. |
| Swagger/configuração                                            | PASS executado  | `/docs-json` retornou `200` e publicou as seis rotas obrigatórias, além de `/health`.                                                                                                                       |
| logs, erros e revisão de código                                 | PASS executado  | Logs JSON emitiram eventos de reconciliação; `requestId` foi preservado no smoke; o conteúdo Base64 do documento não apareceu nos logs.                                                                     |
| `docker compose config` e `docker compose up --build -d --wait` | PASS executado  | Imagem construída, API e PostgreSQL saudáveis, migrations no boot.                                                                                                                                          |
| `npm run test:e2e`                                              | PASS executado  | 1 suíte, 13 testes contra PostgreSQL real.                                                                                                                                                                  |
| smoke HTTP                                                      | PASS executado  | Pedido pendente, Documento pendente, Exame, vínculo, reenvio com item novo e Documento duplicado `409`.                                                                                                     |
| instalação limpa                                                | PASS executado  | Clone remoto, `npm ci`, Compose isolado, migrations, health, Swagger, POST/GET e E2E concluídos.                                                                                                            |

## Nota de ambiente

A porta `3000` estava ocupada por processo externo a este projeto. A validação
operacional usou `PORT=3001` e a instalação limpa usou `PORT=3002`; em ambos
os casos a API continuou na porta interna `3000`, como documentado. Em uma
máquina sem conflito, `docker compose up --build -d --wait` usa `3000` por
padrão.

## Matriz de requisitos

| Requisito do desafio        | Implementação                                             | Teste/evidência                          | Estado atual   |
| --------------------------- | --------------------------------------------------------- | ---------------------------------------- | -------------- |
| Node.js e API REST          | NestJS em `src/`, controllers REST.                       | `npm run build`.                         | PASS executado |
| Persistência PostgreSQL     | TypeORM, entidades e DataSource.                          | Migration aplicada em PostgreSQL vazio.  | PASS           |
| Pedido único                | `UQ_pedidos_codigo_pedido`.                               | E2E: Pedido/reenvio.                     | PASS           |
| Itens sem duplicidade       | `UQ_itens_pedido_pedido_codigo`.                          | E2E e smoke: item novo no reenvio.       | PASS           |
| Correlação por accession    | `ReconciliationService`.                                  | E2E nas ordens previstas e smoke.        | PASS           |
| Exame único                 | `UQ_exames_accession_number`.                             | E2E: reenvio idêntico/divergente.        | PASS           |
| Documento único             | `UQ_documentos_codigo_pedido_codigo_documento`; `409`.    | E2E e smoke: duplicidade.                | PASS           |
| Documento–Exame N:N         | PK composta em `documentos_exames`.                       | E2E, smoke e consulta física do vínculo. | PASS           |
| Seis endpoints obrigatórios | Controllers em `pedidos`, `documentos`, `exames`.         | Swagger, E2E e smoke.                    | PASS           |
| DTOs e validação            | `class-validator`, `ValidationPipe`.                      | Unitários e E2E 400.                     | PASS           |
| Erros padronizados          | `GlobalExceptionFilter`.                                  | E2E 400/404/409/500 e smoke 409.         | PASS           |
| Logs                        | `StructuredLogger` e interceptor HTTP.                    | Unitário de redação e logs do container. | PASS           |
| requestId                   | middleware `x-request-id`.                                | Unitário, E2E e smoke de duplicidade.    | PASS           |
| Swagger                     | `configureApplication` e decorators nos controllers/DTOs. | `/docs-json` HTTP 200.                   | PASS           |
| Docker/Compose              | `Dockerfile`, `docker-compose.yml`.                       | Build, serviços e healthchecks reais.    | PASS           |
| Migrations, sem synchronize | Migration TypeORM; `synchronize: false`.                  | Boot Compose e `migration:show`.         | PASS           |
| Transações                  | `DataSource.transaction` em todos os POSTs.               | E2E de rollback.                         | PASS           |
| Testes Jest/Supertest       | Unitários em `src/**`; E2E em `test/`.                    | 4 suítes/10 unitários e 1 suíte/13 E2E.  | PASS           |
| Lint/formato/build          | ESLint, Prettier e Nest build.                            | comandos acima.                          | PASS executado |
| README                      | [README](../README.md).                                   | revisão documental.                      | PASS revisado  |

## Reprodução da validação operacional

```bash
docker compose up --build -d --wait
docker compose ps
npm run migration:show
npm run test:e2e
curl -fsS http://localhost:3000/health
curl -fsS http://localhost:3000/docs-json > /dev/null
docker compose down -v
```

Em seguida, execute o fluxo do [roteiro auditável](roteiro-auditoria.md):

1. criar Pedido sem Exame e conferir `Integrado: false`;
2. criar Documento para ele e conferir ausência de vínculos;
3. criar Exame com o mesmo `AccessionNumber`;
4. consultar os três GETs e conferir estados/vínculo;
5. reenviar Pedido com item novo e conferir ausência de duplicidade;
6. reenviar Documento e conferir `409 Conflict`.

Os comandos acima foram executados nesta entrega. Use `docker compose down -v`
somente em ambiente descartável, porque ele remove o volume PostgreSQL do
projeto.
