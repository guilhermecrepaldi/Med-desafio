# Fluxo de integração

## 1. Pedido chega primeiro

```text
POST /pedidos
    |
    v
salva/atualiza pedido
    |
    v
adiciona somente itens novos
    |
    v
procura exames por AccessionNumber
    |
    +--> encontrou -> marca pedido integrado
    |
    +--> não encontrou -> mantém pedido pendente
```

## 2. Documento chega antes do exame

```text
POST /documentos
    |
    v
valida CodigoDocumento + CodigoPedido
    |
    v
salva documento
    |
    v
pedido já possui exame relacionado?
    |
    +--> sim -> vincula documento ao(s) exame(s)
    |
    +--> não -> documento permanece pendente
```

## 3. Exame chega depois

```text
POST /exames
    |
    v
salva exame
    |
    v
procura item de pedido pelo AccessionNumber
    |
    +--> não encontrou -> exame fica disponível para futura correlação
    |
    +--> encontrou
            |
            v
      marca pedido integrado
            |
            v
      busca documentos do pedido
            |
            v
      cria vínculos Documento <-> Exame
```

## 4. Exame chega antes do pedido

```text
POST /exames
    |
    v
salva exame sem pedido relacionado

        depois...

POST /pedidos
    |
    v
item possui mesmo AccessionNumber
    |
    v
pedido é imediatamente integrado
```

## 5. Pedido é reenviado com novo item

Estado inicial:

```text
Pedido 616
  - item 930
```

Nova requisição:

```text
Pedido 616
  - item 930
  - item 931
```

Estado esperado:

```text
Pedido 616
  - item 930
  - item 931
```

O item 930 não deve ser duplicado.

## 6. Documento duplicado

Se já existe:

```text
CodigoDocumento = 251
CodigoPedido = 615
```

uma nova tentativa com a mesma combinação deve retornar erro de conflito, planejado como HTTP `409 Conflict`.

## Ideia de serviço de integração

A lógica de correlação não deve ficar espalhada aleatoriamente pelos controllers.

A implementação deverá concentrar a regra de reconciliação em um serviço de domínio/aplicação, por exemplo:

```text
IntegrationService
  reconcilePedido(codigoPedido)
  reconcileExame(accessionNumber)
```

Os nomes ainda podem mudar durante a implementação. O objetivo é manter controller, persistência e regra de integração claramente separados.
