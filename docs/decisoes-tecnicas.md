# Decisões técnicas

Este arquivo registra decisões tomadas durante a construção para que a solução permaneça simples, justificável e fácil de revisar.

## Estado atual

Projeto em fase de modelagem antes da implementação.

## Stack planejada

- Node.js
- NestJS
- PostgreSQL
- TypeORM
- Jest
- Swagger / OpenAPI
- Docker
- Docker Compose
- logs estruturados

A stack pode sofrer pequenos ajustes durante a implementação se houver justificativa técnica.

## Banco relacional

O desafio possui relações claras entre Pedido, ItemPedido, Documento e Exame, além de requisitos de unicidade.

PostgreSQL facilita:

- constraints únicas;
- relacionamentos;
- transações;
- consultas por `AccessionNumber`;
- integridade referencial.

## Reconciliação no evento de escrita

Não será criado cron na primeira versão.

Motivo: sempre que um dos três recursos chega, já existe um ponto natural para tentar a integração imediatamente. Isso reduz latência, simplifica testes e atende diretamente às regras pedidas.

Em um cenário real de produção, um job periódico poderia existir como mecanismo adicional de recuperação/reprocessamento.

## Identidade dos registros

Planejamento inicial:

- Pedido: `CodigoPedido` único.
- Documento: chave única composta `CodigoDocumento + CodigoPedido`.
- Exame recebido: `AccessionNumber` tratado como identificador natural para o escopo do desafio.
- ItemPedido: não será duplicado dentro do mesmo pedido; a constraint exata será definida na modelagem física.

## Integração parcial

O enunciado não define um status intermediário para pedidos com múltiplos itens.

Primeira interpretação:

- se ao menos um item possui exame correspondente, `Pedido.integrado = true`.

Essa escolha segue a redação fornecida e será explicitada na documentação final.

## Vínculo entre documento e exame

Será modelado explicitamente, permitindo que a aplicação saiba quais documentos foram associados a quais exames.

A cardinalidade final será confirmada na etapa de modelagem do banco, mas a solução deve suportar um documento sendo relacionado aos exames aplicáveis do mesmo pedido sem criar associações duplicadas.

## Tratamento de erros

Planejamento:

- `400 Bad Request`: payload inválido;
- `404 Not Found`: recurso solicitado nos endpoints GET não encontrado;
- `409 Conflict`: duplicidade proibida, especialmente documento;
- `500 Internal Server Error`: erro inesperado.

## Escopo consciente

Não serão adicionados Kafka, Redis, AWS ou outros componentes apenas para demonstrar tecnologia.

A prioridade do desafio é:

1. corretude das regras;
2. legibilidade;
3. testes;
4. documentação;
5. facilidade de execução.
