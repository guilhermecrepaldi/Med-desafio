# Decisões técnicas

Este arquivo registra decisões tomadas durante a construção para que a solução permaneça simples, justificável e fácil de revisar.

## Estado atual

A modelagem inicial está documentada em [modelo-dados.md](modelo-dados.md).
O backend ainda não foi iniciado: as decisões abaixo devem orientar a primeira
migration e os endpoints, sem antecipar infraestrutura fora do escopo.

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

O modelo físico detalhado, incluindo diagrama ER, campos, constraints e índices,
fica em [modelo-dados.md](modelo-dados.md).

## Reconciliação no evento de escrita

Não será criado cron na primeira versão.

Motivo: sempre que um dos três recursos chega, já existe um ponto natural para tentar a integração imediatamente. Isso reduz latência, simplifica testes e atende diretamente às regras pedidas.

Em um cenário real de produção, um job periódico poderia existir como mecanismo adicional de recuperação/reprocessamento.

## Identidade dos registros

Decisões consolidadas:

- Pedido: `CodigoPedido` único.
- ItemPedido: `UNIQUE(pedido_id, codigo_item_pedido)`; não será criada
  unicidade adicional de accession dentro do pedido sem regra explícita.
- Exame recebido: `AccessionNumber` tratado como identificador natural para o escopo do desafio.
- Documento: a regra `CodigoDocumento + CodigoPedido` é protegida por
  `UNIQUE(codigo_pedido_referencia, codigo_documento)` e, depois da resolução,
  por `UNIQUE(pedido_id, codigo_documento)`.
- DocumentoExame: chave primária composta `(documento_id, exame_id)`.

Os identificadores externos serão armazenados como texto e normalizados antes
da persistência para não perder zeros à esquerda.

## Documento antes do pedido

Para suportar de fato informações chegando fora de ordem, Documento pode chegar
antes de Pedido. Nesse estado, ele é persistido com
`codigo_pedido_referencia` e `pedido_id` nulo. Quando o Pedido chega, a
reconciliação associa o documento ao pai correto e a FK composta garante que o
ID resolvido pertence ao mesmo `CodigoPedido` recebido.

Essa pequena extensão foi preferida a criar Pedido incompleto ou uma tabela de
staging na primeira versão. A justificativa e a constraint completa estão no
modelo de dados.

## Integração parcial

O enunciado não define um status intermediário para pedidos com múltiplos itens.

Primeira interpretação:

- se ao menos um item possui exame correspondente, `Pedido.integrado = true`.

Essa escolha segue a redação fornecida e será explicitada na documentação final.

## Vínculo entre documento e exame

O vínculo é modelado explicitamente em `documentos_exames`, permitindo que a
aplicação saiba quais documentos foram associados a quais exames.

A cardinalidade é N:N. Um documento é associado a todos os exames já
correlacionados aos itens de seu pedido; a chave composta impede associações
duplicadas. A reconciliação só cria o vínculo depois de validar a cadeia
Documento -> Pedido -> ItemPedido -> AccessionNumber -> Exame.

## Tratamento de erros

Planejamento:

- `400 Bad Request`: payload inválido;
- `404 Not Found`: recurso solicitado nos endpoints GET não encontrado;
- `409 Conflict`: duplicidade proibida, especialmente documento;
- `500 Internal Server Error`: erro inesperado.

## Dúvidas abertas antes da API

- Reenvio de Pedido com dados divergentes em cabeçalho ou item já existente:
  manter, atualizar ou retornar conflito.
- Reenvio de Exame com o mesmo accession: definir comportamento idempotente e
  tratamento de campos divergentes.
- Normalização exata de códigos e accession: a recomendação inicial é aplicar
  `trim` e fazer comparação textual exata.
- O booleano `integrado` foi interpretado como existência de pelo menos uma
  correlação; não significa que todos os itens de um pedido foram recebidos.

Esses pontos permanecem visíveis para que a implementação não escolha uma
regra silenciosamente. O enunciado original continua soberano quando houver
uma definição explícita.

## Escopo consciente

Não serão adicionados Kafka, Redis, AWS ou outros componentes apenas para demonstrar tecnologia.

A prioridade do desafio é:

1. corretude das regras;
2. legibilidade;
3. testes;
4. documentação;
5. facilidade de execução.
