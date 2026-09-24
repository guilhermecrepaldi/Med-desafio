# Auditoria de entrega

## Propósito

Esta matriz transforma o enunciado em evidências revisáveis. A fonte de
verdade funcional é [desafio.md](desafio.md). Um item só é marcado como
**PASS executado** quando o comando correspondente foi realmente concluído
neste ambiente; código versionado ou teste escrito não substitui execução.

## Validado agora

| Evidência | Resultado local | Observação |
| --- | --- | --- |
| `npm ci` | PASS executado | Instalação limpa das dependências; `npm audit --omit=dev` não encontrou vulnerabilidades. |
| `npm run lint` | PASS executado | Sem warnings. |
| `npm run format:check` | PASS executado | Prettier. |
| `npm test` | PASS executado | 4 suítes, 10 testes unitários. |
| `npm run build` e `npx tsc --noEmit -p tsconfig.json` | PASS executado | Build NestJS e tipos, incluindo a suíte E2E. |
| migration e entidades | PASS revisado estaticamente | PKs, FKs, `UNIQUE`, índices, `NOT NULL` e `RESTRICT` conferidos na migration. `synchronize` está desativado. |
| Swagger/configuração | PASS revisado estaticamente | Controllers, DTOs, exemplos, respostas e rota `/docs`/`/docs-json` estão configurados. A resposta HTTP real depende da API com PostgreSQL. |
| logs, erros e revisão de código | PASS revisado | Sem pendências marcadas ou saída de depuração no código; duas correções pontuais foram aplicadas nesta revisão. |
| `docker compose config` | PASS executado | Compose, healthchecks, variáveis e imagem foram validados por inspeção/configuração. |

## Pendente de validação Docker

- `docker compose up --build -d --wait`;
- PostgreSQL vazio e aplicação real das migrations;
- E2E contra PostgreSQL: `npm run test:e2e` foi executado e carregou os 13 cenários, mas todos ficaram bloqueados antes de iniciar por `ECONNREFUSED 127.0.0.1:5432`;
- smoke HTTP completo;
- healthcheck dentro do container;
- instalação limpa ponta a ponta com Docker.

O bloqueio é a permissão do socket Docker deste ambiente. Ele não foi
convertido em aprovação simulada. Os comandos de reprodução estão no README e
abaixo.

## Matriz de requisitos

| Requisito do desafio | Implementação | Teste/evidência | Estado atual |
| --- | --- | --- | --- |
| Node.js e API REST | NestJS em `src/`, controllers REST. | `npm run build`. | PASS executado |
| Persistência PostgreSQL | TypeORM, entidades e DataSource. | Migration `1710000000000` revisada estaticamente. | Implementado; execução bloqueada |
| Pedido único | `UQ_pedidos_codigo_pedido`. | E2E: Pedido/reenvio. | Implementado; E2E bloqueado |
| Itens sem duplicidade | `UQ_itens_pedido_pedido_codigo`. | E2E: item novo no reenvio. | Implementado; E2E bloqueado |
| Correlação por accession | `ReconciliationService`. | E2E nas três ordens. | Implementado; E2E bloqueado |
| Exame único | `UQ_exames_accession_number`. | E2E: reenvio idêntico/divergente. | Implementado; E2E bloqueado |
| Documento único | `UQ_documentos_codigo_pedido_codigo_documento`; `409`. | E2E: duplicidade. | Implementado; E2E bloqueado |
| Documento–Exame N:N | PK composta em `documentos_exames`. | E2E: múltiplos vínculos/idempotência. | Implementado; E2E bloqueado |
| Seis endpoints obrigatórios | Controllers em `pedidos`, `documentos`, `exames`. | Swagger e E2E. | Implementado; E2E bloqueado |
| DTOs e validação | `class-validator`, `ValidationPipe`. | Unitários de data/documento; E2E inválido preparado. | PASS unitário; E2E bloqueado |
| Erros padronizados | `GlobalExceptionFilter`. | E2E 400/404/409/500. | Implementado; E2E bloqueado |
| Logs | `StructuredLogger` e interceptor HTTP. | Teste unitário de redação. | PASS unitário |
| requestId | middleware `x-request-id`. | Teste unitário e E2E previsto. | PASS unitário |
| Swagger | `configureApplication` e decorators nos controllers/DTOs. | Revisão estática; E2E `/docs-json` preparado. | Config PASS; HTTP bloqueado |
| Docker/Compose | `Dockerfile`, `docker-compose.yml`. | `docker compose config`. | Config PASS; subida bloqueada |
| Migrations, sem synchronize | Migration TypeORM; `synchronize: false`. | Código e boot Compose. | Implementado; execução bloqueada |
| Transações | `DataSource.transaction` em todos os POSTs. | E2E de rollback. | Implementado; E2E bloqueado |
| Testes Jest/Supertest | Unitários em `src/**`; E2E em `test/`. | `npm test` passou: 4 suítes, 10 testes. | PASS unitário |
| Lint/formato/build | ESLint, Prettier e Nest build. | comandos acima. | PASS executado |
| README | [README](../README.md). | revisão documental. | PASS revisado |

## Verificação pendente quando Docker estiver acessível

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

Depois desses comandos, substitua somente os estados bloqueados por evidência
real, preservando o resultado dos comandos e a data da auditoria.
