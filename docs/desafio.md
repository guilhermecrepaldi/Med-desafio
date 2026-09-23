# Desafio Técnico — Integração de Pedidos e Documentos

## Contexto

Nossa empresa atua com integrações entre sistemas hospitalares e uma plataforma de telemedicina.

Em muitos cenários, os dados de um exame chegam de forma distribuída entre sistemas diferentes. Por exemplo: a imagem médica pode estar em um sistema, enquanto o pedido médico e documentos complementares chegam por outro.

As imagens médicas normalmente seguem o padrão DICOM, muito utilizado em exames como raio-x, tomografia e ressonância. Além da imagem em si, o DICOM possui tags de metadados, que armazenam informações como nome do paciente, accession number, modalidade, data do exame, entre outros. Em geral, esses metadados já vêm associados ao arquivo da imagem e tendem a ser tratados como informações fixas do exame.

Ainda assim, no fluxo real da operação, muitas informações importantes para o médico não estão organizadas de forma suficiente apenas no DICOM. Por isso, a integração com outros sistemas busca complementar o exame com dados como pedido médico e documentos anexos, ajudando no processo de laudo com mais contexto e organização.

## Objetivo

Desenvolver uma API backend simples que receba:

- pedidos de exame;
- documentos vinculados a pedidos;
- eventos de chegada de exame.

A aplicação deve relacionar essas informações conforme as regras descritas abaixo.

## Escopo do desafio

### Entidade: Pedido

Exemplo:

```json
{
  "CodigoPedido": 616,
  "NomePaciente": "ALEFHER MONTONI DE ALMEIDA",
  "DataNascimento": "19970601",
  "Sexo": "M",
  "CodUnidade": 104,
  "Exames": [
    {
      "CodigoItemPedido": 930,
      "AccessionNumber": "930",
      "Modalidade": "CR",
      "NomeProcedimento": "RX ANTEBRACO ESQUERDO"
    }
  ]
}
```

### Entidade: Documento

Exemplo:

```json
{
  "CodigoDocumento": 251,
  "CodigoPedido": 615,
  "NomeDocumento": "PEDIDO",
  "Documento": "base64"
}
```

### Entidade: Exame

Exemplo:

```json
{
  "AccessionNumber": "930",
  "NomePaciente": "ALEFHER MONTONI DE ALMEIDA",
  "Modalidade": "CR",
  "Status": "NOVO"
}
```

## Regras de negócio

### 1. Recebimento de pedidos

A aplicação deve possuir um endpoint para recebimento de pedidos.

Regras:

- Um pedido deve ser salvo com base no `CodigoPedido`.
- Se já existir pedido com o mesmo `CodigoPedido`, os novos exames devem ser adicionados somente se ainda não existirem naquele pedido.
- Cada exame do pedido deve conter pelo menos:
  - `CodigoItemPedido`;
  - `AccessionNumber`;
  - `Modalidade`;
  - `NomeProcedimento`.

### 2. Integração do pedido com exame existente

Ao receber um pedido, a aplicação deve verificar se já existe um exame com o mesmo `AccessionNumber`.

Regras:

- Se existir exame correspondente, o pedido deve ser marcado como `integrado: true`.
- Se não existir exame correspondente, o pedido deve permanecer como `integrado: false`.

### 3. Recebimento de documentos

A aplicação deve possuir um endpoint para recebimento de documentos vinculados a pedidos.

Regras:

- O documento deve ser salvo com base na combinação:
  - `CodigoDocumento`;
  - `CodigoPedido`.
- Não deve ser permitido documento duplicado com a mesma combinação.
- Se o pedido relacionado já estiver integrado, o documento deve ser vinculado aos exames do pedido.
- Após a vinculação, o documento pode ser marcado como `integrado: true`.

### 4. Chegada de exame

A aplicação deve possuir um endpoint para simular a chegada de um exame.

Regras:

- Ao receber um exame, o sistema deve verificar se existe pedido com exame de mesmo `AccessionNumber`.
- Se existir, o pedido deve ser marcado como `integrado: true`.
- Se existirem documentos pendentes para aquele `CodigoPedido`, eles devem ser vinculados ao exame.

## Endpoints mínimos esperados

```http
POST /pedidos
POST /documentos
POST /exames
GET /pedidos/:codigoPedido
GET /documentos/:codigoPedido
GET /exames/:accessionNumber
```

## Casos mínimos esperados

### Pedido chega e não existe exame correspondente

Resultado esperado: pedido salvo como não integrado.

### Pedido chega e já existe exame com mesmo accession number

Resultado esperado: pedido salvo como integrado.

### Documento chega para pedido ainda não integrado

Resultado esperado: documento salvo, mas ainda não vinculado ao exame.

### Depois chega um exame referente a esse pedido

Resultado esperado: pedido passa a integrado e documento é vinculado.

### Pedido chega novamente com novo exame

Resultado esperado: adicionar apenas o exame novo, sem duplicar os antigos.

### Documento duplicado chega novamente

Resultado esperado: retorno de erro de duplicidade.

## Requisitos técnicos

### Obrigatórios

- Node.js.
- API REST.
- Persistência de dados.
- Docker.
- README com instruções de execução.
- Tratamento básico de erros.
- Estrutura de projeto organizada.
- Testes automatizados com Jest.
- Documentação com Swagger.
- Logs.

### Diferenciais

- NestJS.
- Logs estruturados.
- Boa separação de camadas.
- Explicação das decisões técnicas no README.
- Uso de Docker Compose.

## O que não precisa fazer

Para manter o desafio objetivo, não é necessário implementar:

- parsing real de DICOM;
- HL7 real;
- autenticação;
- mensageria;
- integração real com AWS;
- front-end;
- regra de usaCodigoPedido;
- exames complementares;
- concorrência real;
- storage real de anexos;
- regras avançadas do fluxo original.

## Entrega esperada

A entrega deve conter:

- código-fonte do projeto;
- instruções claras para execução;
- arquivo `README.md`;
- configuração para rodar com Docker.

Se houver simplificações, premissas ou decisões de modelagem, descrevê-las no README.

## O que será avaliado

- clareza e organização do código;
- modelagem da solução;
- tratamento de erros;
- organização das camadas da aplicação;
- capacidade de implementar regras de integração;
- qualidade da documentação;
- preocupação com manutenção e legibilidade.

## Observações

Não é esperada uma solução perfeita nem um projeto pronto para produção.

O objetivo é entender como o candidato estrutura uma solução, toma decisões técnicas e traduz regras de integração em código de forma clara e consistente.
