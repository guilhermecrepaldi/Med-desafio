# Med-desafio

Backend para o desafio técnico de integração de pedidos, documentos e exames.

O objetivo deste repositório é implementar uma API REST capaz de receber dados que podem chegar fora de ordem, persistir cada informação e reconciliar automaticamente os registros quando houver dados suficientes para relacioná-los.

## Status

**Fase atual:** entendimento do domínio e definição da modelagem.

A implementação ainda não foi iniciada de propósito. Primeiro estão sendo registradas as regras, ambiguidades e decisões técnicas para que o código nasça em cima de um modelo claro.

## Referências do processo seletivo

- [Descrição da vaga](docs/vaga.md)
- [Enunciado completo do desafio técnico](docs/desafio.md)

## O problema

A aplicação receberá três tipos principais de informação:

- pedidos de exame;
- documentos relacionados a pedidos;
- eventos de chegada de exames.

O vínculo principal entre um item de pedido e um exame recebido será feito por `AccessionNumber`.

Exemplo:

```text
Pedido chega
  -> ainda não existe exame
  -> pedido fica pendente

Documento chega
  -> ainda não existe exame
  -> documento fica pendente

Exame chega com o mesmo AccessionNumber
  -> pedido é integrado
  -> documento é vinculado ao exame
```

A ordem inversa também deve funcionar.

## Endpoints esperados

```http
POST /pedidos
POST /documentos
POST /exames

GET /pedidos/:codigoPedido
GET /documentos/:codigoPedido
GET /exames/:accessionNumber
```

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

## Documentação de estudo e modelagem

- [Domínio do desafio](docs/dominio.md)
- [Fluxos de integração](docs/fluxo-integracao.md)
- [Decisões técnicas](docs/decisoes-tecnicas.md)

## Princípios da solução

A implementação será guiada por alguns princípios simples:

- persistir antes de tentar correlacionar;
- aceitar chegada fora de ordem;
- evitar duplicidades;
- tornar reenvios previsíveis;
- usar constraints de banco para proteger regras importantes;
- manter controllers simples;
- separar regra de integração da camada HTTP;
- testar o estado final do sistema, não apenas códigos HTTP;
- não adicionar infraestrutura que o desafio não exige.

## Casos mínimos que deverão ser testados

1. Pedido chega sem exame correspondente.
2. Pedido chega quando o exame já existe.
3. Documento chega para pedido ainda não integrado.
4. Exame chega posteriormente e integra pedido e documento.
5. Pedido é reenviado com novo item sem duplicar os anteriores.
6. Documento duplicado é rejeitado.

Também serão cobertos cenários de chegada fora de ordem e múltiplos itens no mesmo pedido.

## Próximas etapas

```text
[feito] Registrar a vaga
[feito] Registrar o desafio técnico
[feito] Entender o domínio
[feito] Desenhar os fluxos principais
[feito] Registrar decisões técnicas iniciais
[ ] Modelar o banco de dados
[ ] Criar o projeto NestJS
[ ] Configurar PostgreSQL e Docker Compose
[ ] Implementar Pedido
[ ] Implementar Exame
[ ] Implementar Documento
[ ] Implementar serviço de reconciliação
[ ] Adicionar Swagger
[ ] Adicionar logs estruturados
[ ] Criar testes automatizados
[ ] Revisar README para entrega
```

## Observação

Este projeto é deliberadamente pequeno. O objetivo não é simular uma plataforma hospitalar inteira, mas demonstrar modelagem, integração, idempotência, persistência, tratamento de erros, testes e clareza arquitetural.
