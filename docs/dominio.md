# Domínio do desafio

## Objetivo

A aplicação deve receber informações de três origens lógicas diferentes:

1. pedidos de exame;
2. documentos vinculados a pedidos;
3. eventos de chegada de exames.

Essas informações podem chegar em momentos diferentes. A responsabilidade central do sistema é persistir o que chegou e reconciliar os dados quando houver informação suficiente para relacioná-los.

## Entidades

### Pedido

Representa uma solicitação de exame feita para um paciente.

Identificador principal de negócio:

- `CodigoPedido`

Dados previstos no desafio:

- `CodigoPedido`
- `NomePaciente`
- `DataNascimento`
- `Sexo`
- `CodUnidade`
- lista de itens/exames solicitados
- estado de integração

Um pedido pode conter um ou mais itens de exame.

### Item do Pedido

Representa cada exame solicitado dentro de um pedido.

Campos mínimos:

- `CodigoItemPedido`
- `AccessionNumber`
- `Modalidade`
- `NomeProcedimento`

Apesar de o enunciado chamar esses registros de "Exames" dentro do pedido, no domínio da aplicação será útil tratá-los como itens do pedido para não confundir com o exame que efetivamente chegou ao sistema.

### Exame recebido

Representa o evento de chegada de um exame à plataforma.

Campos informados no desafio:

- `AccessionNumber`
- `NomePaciente`
- `Modalidade`
- `Status`

O `AccessionNumber` é a principal chave de correlação entre o exame recebido e um item existente em um pedido.

### Documento

Representa um documento complementar relacionado a um pedido.

Campos:

- `CodigoDocumento`
- `CodigoPedido`
- `NomeDocumento`
- `Documento` (conteúdo representado como Base64 no desafio)
- estado de integração

A combinação `CodigoDocumento + CodigoPedido` deve ser única.

## Identificadores e correlação

### CodigoPedido

Liga documentos a pedidos e identifica um pedido de forma única.

### CodigoItemPedido

Identifica um item dentro do pedido.

### AccessionNumber

É o principal elo entre:

- o item solicitado dentro do pedido;
- o exame que chegou posteriormente ou anteriormente.

Exemplo:

```text
Pedido 616
  Item 930
    AccessionNumber = 930

Exame recebido
  AccessionNumber = 930

=> o sistema consegue correlacionar os dois registros
```

## Conceito de integração

### Pedido integrado

Pela interpretação literal do desafio, o pedido passa a `integrado = true` quando existir exame recebido com `AccessionNumber` correspondente a pelo menos um de seus itens.

Essa premissa será documentada no README porque o enunciado não define um estado "parcialmente integrado" para pedidos com múltiplos itens.

### Documento integrado

Um documento fica integrado quando consegue ser vinculado a exame(s) pertencente(s) ao pedido associado.

## Princípio central

A ordem de chegada dos dados não pode quebrar o fluxo.

Devem funcionar, por exemplo:

```text
Pedido -> Documento -> Exame
```

e também:

```text
Exame -> Pedido -> Documento
```

O sistema deve sempre:

1. persistir o que recebeu;
2. verificar se já possui informação suficiente para correlacionar os registros;
3. criar os vínculos possíveis;
4. deixar o restante pendente para uma futura chegada de dados.

## Idempotência

O desafio contém situações de reenvio.

A aplicação deve garantir que:

- o mesmo pedido não seja duplicado;
- itens já existentes dentro do pedido não sejam duplicados;
- a combinação `CodigoDocumento + CodigoPedido` não seja aceita duas vezes;
- associações já existentes não sejam recriadas de forma duplicada.

## Regra de reconciliação

A primeira estratégia do projeto será reconciliação no momento da escrita.

Sempre que chegar:

- um pedido;
- um documento;
- ou um exame;

a aplicação salva o dado e imediatamente tenta encontrar relações possíveis.

Um job/cron de reconciliação periódica pode ser uma estratégia complementar em sistemas reais, mas não será adotado inicialmente porque não é necessário para atender ao escopo do desafio.

## Fora do escopo

Conforme o enunciado, não será implementado nesta solução inicial:

- parsing real de DICOM;
- HL7 real;
- autenticação;
- mensageria;
- integração com AWS;
- front-end;
- storage real de anexos;
- concorrência avançada;
- regras hospitalares adicionais não solicitadas.
