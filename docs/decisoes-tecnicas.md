# Decisões técnicas

Este arquivo registra decisões tomadas durante a construção para que a solução permaneça simples, justificável e fácil de revisar.

## Estado atual

A modelagem está implementada em NestJS, TypeORM e migrations PostgreSQL. A
API, a reconciliação por escrita, Docker Compose, Swagger, logs estruturados,
testes unitários e a suíte E2E estão versionados. A documentação de execução e
os contratos HTTP ficam no [README](../README.md).

## Stack utilizada

- Node.js
- NestJS
- PostgreSQL
- TypeORM
- Jest
- Swagger / OpenAPI
- Docker
- Docker Compose
- logs estruturados

As dependências são fixadas por <code>package-lock.json</code>. A versão do
adaptador Nest–TypeORM acompanha NestJS 11 para manter a execução CommonJS do
Jest compatível com a aplicação.

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

Comportamento implementado:

- `400 Bad Request`: payload inválido;
- `404 Not Found`: recurso solicitado nos endpoints GET não encontrado;
- `409 Conflict`: duplicidade proibida, especialmente documento;
- `500 Internal Server Error`: erro inesperado.

## Reenvios e normalização

As ambiguidades antes abertas foram resolvidas de forma conservadora e estão
cobertas pelo README e pelos E2E:

- identificadores externos aceitam número ou texto, são convertidos para texto
  e recebem apenas <code>trim</code>; comparações são exatas e preservam zeros
  à esquerda quando a origem os envia como texto;
- reenvio idêntico de Pedido reutiliza o registro e adiciona só ItemPedido
  novo; cabeçalho ou item já persistido com conteúdo divergente retorna
  <code>409 Conflict</code>, sem alterar silenciosamente a primeira mensagem;
- reenvio idêntico de Exame com o mesmo accession é idempotente e dispara
  reconciliação novamente; conteúdo divergente retorna <code>409 Conflict</code>;
- Documento repetido sempre retorna <code>409 Conflict</code>, porque a regra
  original proíbe a combinação de códigos duplicada;
- <code>integrado</code> significa existência de ao menos uma correlação, não
  completude de todos os itens do Pedido.

## Transações e concorrência

Cada POST executa persistência e reconciliação na mesma transação TypeORM. Se
o serviço de reconciliação falhar, Pedido/Documento/Exame recém-criado e os
vínculos derivados são revertidos juntos. Constraints continuam sendo a última
linha de proteção contra duplicidade; o desafio deixa concorrência avançada
fora do escopo.

## Logs e rastreabilidade

O middleware reutiliza um <code>x-request-id</code> seguro ou gera um UUID e
o devolve na resposta. Logs JSON incluem esse identificador e eventos de
recebimento, criação/reuso/atualização, item adicionado, reconciliação,
vínculo, integração e falhas. O logger não registra corpo HTTP nem conteúdo
Base64 de Documento.

## Exemplos do enunciado

O exemplo de Pedido usa `CodigoPedido = 616`, enquanto o exemplo isolado de
Documento usa `CodigoPedido = 615`. Como a regra exige que Documento se
vincule a um Pedido pelo mesmo código, esses exemplos são tratados como
ilustrações independentes, sem alterar `docs/desafio.md`. Os testes de
integração usarão valores consistentes entre Pedido e Documento para validar o
vínculo.

## Escopo consciente

Não serão adicionados Kafka, Redis, AWS ou outros componentes apenas para demonstrar tecnologia.

A prioridade do desafio é:

1. corretude das regras;
2. legibilidade;
3. testes;
4. documentação;
5. facilidade de execução.
