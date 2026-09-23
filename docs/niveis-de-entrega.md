# Níveis de entrega

## Propósito

Este plano divide a construção em marcos verificáveis. Cada nível inclui o
anterior: o Nível 1 é uma entrega suficiente caso o prazo termine; os níveis
seguintes melhoram a qualidade da solução sem ampliar o problema proposto.

`docs/desafio.md` continua sendo a fonte principal das regras funcionais.

## Nível 1 — Mínimo funcional

Objetivo: atender integralmente aos requisitos obrigatórios do desafio com uma
API utilizável, persistente e simples de executar.

### Requisitos técnicos

- Node.js e API REST;
- persistência real em PostgreSQL;
- Docker para executar a aplicação;
- README com instruções de execução e premissas adotadas;
- tratamento básico e consistente de erros;
- estrutura de projeto organizada;
- testes automatizados com Jest;
- documentação Swagger/OpenAPI;
- logs;
- os endpoints obrigatórios:

  ```http
  POST /pedidos
  POST /documentos
  POST /exames
  GET /pedidos/:codigoPedido
  GET /documentos/:codigoPedido
  GET /exames/:accessionNumber
  ```

### Comportamentos que precisam estar prontos

1. Salvar um pedido sem exame correspondente como não integrado.
2. Integrar imediatamente um pedido quando já houver exame com o mesmo
   `AccessionNumber`.
3. Salvar um documento de pedido ainda não integrado, sem vínculo de exame.
4. Ao receber posteriormente o exame correspondente, integrar o pedido e
   vincular os documentos pendentes.
5. Aceitar o reenvio de pedido com item novo sem duplicar itens já existentes.
6. Rejeitar documento duplicado pela combinação de código de documento e
   código de pedido.
7. Suportar a chegada de exame antes de pedido e as demais ordens previstas
   pelas regras do desafio.

### Critério de pronto

Uma pessoa avaliadora consegue subir a aplicação com Docker, consultar o
Swagger, enviar os exemplos do desafio e confirmar, por testes e endpoints
GET, o estado final de cada caso mínimo.

## Nível 2 — Entrega profissional

Objetivo: tornar o mínimo funcional sustentável, fácil de revisar e seguro
contra reenvios comuns de integrações.

- NestJS e TypeScript;
- TypeORM e migrations versionadas;
- Docker Compose para aplicação e PostgreSQL;
- logs estruturados;
- separação clara entre controllers, casos de uso, persistência e domínio;
- serviço específico de reconciliação, centralizando a correlação entre
  pedidos, documentos e exames;
- constraints e índices relevantes no banco;
- idempotência nos fluxos que admitem reenvio;
- transações nos pontos em que persistência e reconciliação precisam ser
  atômicas;
- testes unitários e E2E com Jest e Supertest;
- Swagger detalhado, com schemas, respostas de erro e exemplos de
  requests/responses;
- formato padronizado de erros;
- README explicando a arquitetura, as decisões e como validar a solução.

### Critério de pronto

Além dos casos do Nível 1, os reenvios não criam dados ou vínculos duplicados,
as regras de integridade são protegidas também pelo PostgreSQL e a aplicação é
compreensível sem que a regra de negócio fique concentrada nos controllers.

## Nível 3 — Entrega máxima / diferenciais

Objetivo: acrescentar sinais de maturidade operacional e de qualidade, apenas
quando forem coerentes com este desafio e não comprometerem a simplicidade.

- `correlationId` e/ou `requestId` nos logs;
- healthcheck;
- lint e formatação automatizados;
- cobertura de testes acompanhada por meta documentada;
- GitHub Actions para lint, testes e build;
- observabilidade melhorada, com logs úteis para investigar uma
  reconciliação;
- cenários adicionais de testes, especialmente ordens de chegada e reenvios;
- documentação arquitetural, diagrama ER e documentação dos fluxos;
- estratégia documentada de reconciliação e reprocessamento para produção;
- respostas Swagger especialmente completas e exemplificadas.

Um job periódico pode aparecer somente nessa estratégia documentada como
mecanismo adicional de recuperação em produção. Ele não será implementado na
primeira versão: a reconciliação obrigatória acontece no momento de cada
escrita.

## Limites conscientes de escopo

Não serão adicionados apenas para demonstrar tecnologia:

- Kafka, RabbitMQ ou Redis;
- AWS;
- autenticação;
- front-end;
- parsing real de DICOM;
- HL7 real;
- microsserviços;
- Kubernetes.

Esses itens não foram pedidos pelo desafio e desviariam o foco de modelagem,
persistência, correlação, tratamento de erro, testes e clareza da solução.

## Ordem recomendada

1. Fechar a modelagem e as ambiguidades registradas em
   [modelo-dados.md](modelo-dados.md).
2. Implementar e validar o Nível 1 por inteiro.
3. Evoluir para o Nível 2 sem alterar as regras funcionais.
4. Selecionar somente os diferenciais do Nível 3 que tragam valor objetivo à
   entrega.
