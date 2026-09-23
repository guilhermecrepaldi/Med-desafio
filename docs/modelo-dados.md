# Modelo de dados

## Objetivo e premissas

O modelo relacional permite receber Pedido, Documento e Exame em ordens
diferentes, persistir o que chegou e reconciliar os vínculos possíveis depois.
A sequência de cada entrada é:

~~~text
receber -> validar -> persistir -> reconciliar -> criar vínculos -> atualizar estados
~~~

Há uma distinção intencional entre duas entidades que o enunciado chama de
“exame” em contextos diferentes:

- **ItemPedido** representa o procedimento solicitado dentro de um pedido.
- **Exame** representa o evento de exame efetivamente recebido pela
  plataforma.

As entidades são correlacionadas por <code>AccessionNumber</code>, mas não são
a mesma coisa e não compartilham uma tabela.

As tabelas usam <code>snake_case</code>; os DTOs da API poderão manter os
nomes do payload do desafio, como <code>CodigoPedido</code> e
<code>AccessionNumber</code>. Códigos externos são persistidos como texto para
não perder zeros à esquerda nem tratá-los como números aritméticos. Quando a
API receber o exemplo numérico do enunciado, ela deverá normalizá-lo para a
mesma representação textual antes de consultar ou gravar.

As chaves técnicas <code>id</code> serão <code>BIGINT GENERATED ... AS
IDENTITY</code>. Datas de auditoria usam <code>TIMESTAMPTZ</code> em UTC.
<code>DataNascimento</code>, recebida no formato <code>YYYYMMDD</code>, será
validada e persistida como <code>DATE</code>.

## Diagrama ER

~~~mermaid
erDiagram
    PEDIDOS ||--o{ ITENS_PEDIDO : possui
    PEDIDOS o|--o{ DOCUMENTOS : associa_apos_reconciliacao
    DOCUMENTOS ||--o{ DOCUMENTOS_EXAMES : participa
    EXAMES ||--o{ DOCUMENTOS_EXAMES : participa
    EXAMES o|--o{ ITENS_PEDIDO : correlaciona_por_accession

    PEDIDOS {
        bigint id PK
        varchar codigo_pedido UK
        boolean integrado
    }
    ITENS_PEDIDO {
        bigint id PK
        bigint pedido_id FK
        varchar codigo_item_pedido
        varchar accession_number
    }
    EXAMES {
        bigint id PK
        varchar accession_number UK
        varchar status
    }
    DOCUMENTOS {
        bigint id PK
        bigint pedido_id FK
        varchar codigo_pedido_referencia
        varchar codigo_documento
        boolean integrado
    }
    DOCUMENTOS_EXAMES {
        bigint documento_id PK, FK
        bigint exame_id PK, FK
        timestamptz created_at
    }
~~~

O elo entre <code>ITENS_PEDIDO</code> e <code>EXAMES</code> é **lógico**, por
igualdade de <code>accession_number</code>; não existe FK entre eles. Isso
permite que exame e pedido cheguem em qualquer ordem. Já
<code>DOCUMENTOS_EXAMES</code> é o vínculo físico, auditável e idempotente
entre um documento e um exame reconciliados.

A cardinalidade de negócio final é Pedido 1:N Documento. Enquanto um documento
aguarda um Pedido que ainda não chegou, seu <code>pedido_id</code> permanece
nulo de forma temporária; ao reconciliar, ele passa a pertencer a exatamente
um Pedido.

## Tabelas

### <code>pedidos</code>

| Coluna | Tipo e regra | Observação |
| --- | --- | --- |
| <code>id</code> | <code>BIGINT</code> PK por identidade | Chave técnica interna. |
| <code>codigo_pedido</code> | <code>VARCHAR(100) NOT NULL UNIQUE</code> | Identificador de negócio do pedido. |
| <code>nome_paciente</code> | <code>VARCHAR(255) NOT NULL</code> | Valor do payload de pedido. |
| <code>data_nascimento</code> | <code>DATE NOT NULL</code> | Entrada prevista como <code>YYYYMMDD</code>. |
| <code>sexo</code> | <code>VARCHAR(20) NOT NULL</code> | Sem enum/check: o desafio não fixa valores permitidos. |
| <code>cod_unidade</code> | <code>VARCHAR(100) NOT NULL</code> | Código externo preservado como texto. |
| <code>integrado</code> | <code>BOOLEAN NOT NULL DEFAULT FALSE</code> | Estado materializado de integração. |
| <code>created_at</code> | <code>TIMESTAMPTZ NOT NULL DEFAULT NOW()</code> | Auditoria. |
| <code>updated_at</code> | <code>TIMESTAMPTZ NOT NULL DEFAULT NOW()</code> | Atualizado pelo ORM/aplicação. |

Além da unicidade de <code>codigo_pedido</code>, haverá
<code>UNIQUE (id, codigo_pedido)</code>. Ela serve como chave-alvo da FK
composta de documentos e garante que, ao preencher um
<code>pedido_id</code>, ele corresponde ao mesmo código externo recebido.

### <code>itens_pedido</code>

| Coluna | Tipo e regra | Observação |
| --- | --- | --- |
| <code>id</code> | <code>BIGINT</code> PK por identidade | Chave técnica interna. |
| <code>pedido_id</code> | <code>BIGINT NOT NULL</code> FK para <code>pedidos(id)</code> | Cada item pertence a um Pedido. |
| <code>codigo_item_pedido</code> | <code>VARCHAR(100) NOT NULL</code> | Identifica o item no contexto do pedido. |
| <code>accession_number</code> | <code>VARCHAR(100) NOT NULL</code> | Chave de correlação lógica com Exame. |
| <code>modalidade</code> | <code>VARCHAR(50) NOT NULL</code> | Ex.: <code>CR</code>. |
| <code>nome_procedimento</code> | <code>VARCHAR(255) NOT NULL</code> | Procedimento solicitado. |
| <code>created_at</code> | <code>TIMESTAMPTZ NOT NULL DEFAULT NOW()</code> | Auditoria. |
| <code>updated_at</code> | <code>TIMESTAMPTZ NOT NULL DEFAULT NOW()</code> | Atualizado pelo ORM/aplicação. |

Constraint obrigatória:

~~~text
UNIQUE (pedido_id, codigo_item_pedido)
~~~

Ela impede que o reenvio duplique o mesmo item dentro de um pedido, sem
proibir que o mesmo <code>CodigoItemPedido</code> exista em pedidos
diferentes.

Não será criada inicialmente uma constraint
<code>UNIQUE (pedido_id, accession_number)</code>. O desafio não afirma que
dois itens de um mesmo pedido não possam compartilhar accession; proibir isso
acrescentaria uma regra não solicitada. Haverá, em vez disso, índice por
<code>accession_number</code> para reconciliação.

### <code>exames</code>

| Coluna | Tipo e regra | Observação |
| --- | --- | --- |
| <code>id</code> | <code>BIGINT</code> PK por identidade | Chave técnica interna. |
| <code>accession_number</code> | <code>VARCHAR(100) NOT NULL UNIQUE</code> | Identificador natural no escopo deste desafio. |
| <code>nome_paciente</code> | <code>VARCHAR(255) NOT NULL</code> | Valor do evento recebido. |
| <code>modalidade</code> | <code>VARCHAR(50) NOT NULL</code> | Valor do evento recebido. |
| <code>status</code> | <code>VARCHAR(50) NOT NULL</code> | Sem enum/check: o ciclo de vida não foi definido. |
| <code>created_at</code> | <code>TIMESTAMPTZ NOT NULL DEFAULT NOW()</code> | Auditoria. |
| <code>updated_at</code> | <code>TIMESTAMPTZ NOT NULL DEFAULT NOW()</code> | Atualizado pelo ORM/aplicação. |

<code>UNIQUE (accession_number)</code> é uma premissa explícita deste desafio.
Em uma integração hospitalar real, um accession pode depender de emissor,
unidade, domínio ou outras chaves. Essa regra não deve ser generalizada sem
validar o sistema de origem.

### <code>documentos</code>

| Coluna | Tipo e regra | Observação |
| --- | --- | --- |
| <code>id</code> | <code>BIGINT</code> PK por identidade | Chave técnica interna. |
| <code>codigo_documento</code> | <code>VARCHAR(100) NOT NULL</code> | Código externo do documento. |
| <code>codigo_pedido_referencia</code> | <code>VARCHAR(100) NOT NULL</code> | <code>CodigoPedido</code> recebido; mantém o documento identificável antes do Pedido existir. |
| <code>pedido_id</code> | <code>BIGINT NULL</code> FK composta para <code>pedidos(id, codigo_pedido)</code> | Nulo somente enquanto aguarda o Pedido; preenchido na reconciliação. |
| <code>nome_documento</code> | <code>VARCHAR(255) NOT NULL</code> | Ex.: <code>PEDIDO</code>. |
| <code>documento</code> | <code>TEXT NOT NULL</code> | Conteúdo Base64 previsto no escopo, sem storage externo. |
| <code>integrado</code> | <code>BOOLEAN NOT NULL DEFAULT FALSE</code> | Verdadeiro depois de existir ao menos um vínculo. |
| <code>created_at</code> | <code>TIMESTAMPTZ NOT NULL DEFAULT NOW()</code> | Auditoria. |
| <code>updated_at</code> | <code>TIMESTAMPTZ NOT NULL DEFAULT NOW()</code> | Atualizado pelo ORM/aplicação. |

As constraints de documento são:

~~~text
UNIQUE (codigo_pedido_referencia, codigo_documento)
UNIQUE (pedido_id, codigo_documento)
FOREIGN KEY (pedido_id, codigo_pedido_referencia)
  REFERENCES pedidos (id, codigo_pedido)
~~~

A primeira é a proteção autoritativa da regra original
<code>CodigoDocumento + CodigoPedido</code>, inclusive enquanto o documento
está pendente. A segunda é a equivalência física solicitada após o Pedido ser
resolvido: <code>pedido_id</code> referencia o pedido cujo
<code>codigo_pedido</code> é o <code>CodigoPedido</code> do documento.

A FK composta inclui a relação solicitada de <code>pedido_id</code> com
<code>pedidos.id</code> e ainda protege a equivalência no próprio banco. Com
<code>pedido_id = NULL</code>, o comportamento padrão de FK do PostgreSQL
(<code>MATCH SIMPLE</code>) permite o estado pendente; quando ele é preenchido,
o banco exige que ID e código apontem para o mesmo Pedido.

O campo auxiliar <code>codigo_pedido_referencia</code> é uma adição mínima e
deliberada ao conjunto de campos inicialmente sugerido. Sem ele, a unicidade
original não poderia ser garantida para Documento antes de Pedido: PostgreSQL
aceita múltiplos valores nulos em uma constraint única baseada apenas em
<code>pedido_id</code>. Ele evita tanto uma tabela de staging prematura quanto
a criação implícita de um Pedido incompleto.

### <code>documentos_exames</code>

| Coluna | Tipo e regra | Observação |
| --- | --- | --- |
| <code>documento_id</code> | <code>BIGINT NOT NULL</code> FK para <code>documentos(id)</code> | Parte da PK composta. |
| <code>exame_id</code> | <code>BIGINT NOT NULL</code> FK para <code>exames(id)</code> | Parte da PK composta. |
| <code>created_at</code> | <code>TIMESTAMPTZ NOT NULL DEFAULT NOW()</code> | Momento da reconciliação. |

A chave primária é composta por:

~~~text
PRIMARY KEY (documento_id, exame_id)
~~~

A associação não tem identidade de negócio própria nem atributos que
justifiquem uma chave surrogate. A PK composta já representa e garante
<code>UNIQUE(documentoId, exameId)</code>.

## Integridade e índices

Além das PKs, FKs e unicidades, a migration inicial deve criar:

| Objeto | Finalidade |
| --- | --- |
| índice de <code>itens_pedido(accession_number)</code> | Localizar itens quando um Exame chega. |
| índice implícito de <code>documentos(codigo_pedido_referencia, codigo_documento)</code> | Criado pela unicidade; atende a busca do GET inclusive para documentos pendentes. |
| índice implícito de <code>documentos(pedido_id, codigo_documento)</code> | Criado pela unicidade; atende a busca de documentos já resolvidos por Pedido. |
| índice de <code>documentos_exames(exame_id)</code> | Navegar de Exame para Documento; a PK já cobre buscas por <code>documento_id</code>. |
| índices das constraints <code>UNIQUE</code> | Consultas por códigos de negócio e proteção contra duplicidade. |

Não há índice isolado de <code>integrado</code> no início: não existe consulta
prevista que o justifique e booleanos costumam ter baixa seletividade.

As FKs usarão <code>ON DELETE RESTRICT</code>. Não há fluxo de exclusão no
desafio; impedir exclusões acidentais preserva a integridade e evita introduzir
<code>CASCADE</code> sem uma regra que o justifique.

## Reconciliação e estados

A lógica ficará centralizada em um serviço de aplicação, previsto como
<code>ReconciliationService</code>, e não nos controllers. Em uma única
transação quando houver escrita e reconciliação relacionadas, ele deve:

1. localizar itens por <code>accession_number</code> quando um Exame chega;
2. localizar Exames existentes quando um Pedido ou item novo chega;
3. resolver documentos pendentes pelo
   <code>codigo_pedido_referencia</code> quando o Pedido chega;
4. criar somente os vínculos ainda inexistentes em
   <code>documentos_exames</code>;
5. atualizar os estados materializados.

A semântica adotada, preservando a interpretação já registrada em
[decisoes-tecnicas.md](decisoes-tecnicas.md), é:

- Pedido fica <code>integrado = true</code> quando **ao menos um** de seus itens
  possui Exame correspondente.
- Documento fica <code>integrado = true</code> quando possui **ao menos um**
  vínculo em <code>documentos_exames</code>.
- Documento é ligado a todos os Exames já correlacionados aos itens de seu
  Pedido. Um Exame correlacionado que chegar depois cria somente o vínculo que
  ainda não existir.

Assim, o booleano <code>integrado</code> significa “há integração possível
realizada”, não “todos os itens do pedido estão completos”. Sem exclusões no
escopo, ele é monotônico.

Não haverá cron na primeira implementação. A tentativa ocorre ao receber
Pedido, Documento ou Exame. Em produção, um job de recuperação pode existir
como mecanismo adicional, mas não é necessário para atender ao desafio.

## Decisões e dúvidas abertas

### Decisões desta modelagem

1. ItemPedido e Exame são entidades diferentes e a correlação entre eles é
   lógica por <code>AccessionNumber</code>, não por FK.
2. A unicidade de item é
   <code>UNIQUE(pedido_id, codigo_item_pedido)</code>; não há unicidade extra
   de accession dentro do pedido.
3. Documento antes de Pedido é suportado de forma explícita por
   <code>codigo_pedido_referencia</code> e <code>pedido_id</code> temporariamente
   nulo. Isso atende ao requisito de chegada fora de ordem sem enfraquecer a
   integridade depois da reconciliação.
4. A chave composta de <code>documentos_exames</code> evita associações
   duplicadas sem introduzir um ID artificial.
5. A correlação usa apenas <code>AccessionNumber</code>. Nome do paciente e
   modalidade são persistidos, mas não bloqueiam a correlação porque o desafio
   não define tratamento de divergências.

### Pontos que ainda precisam de decisão antes dos endpoints

1. **Reenvio com conteúdo divergente:** o desafio manda adicionar apenas itens
   novos, mas não diz se cabeçalho do Pedido ou item já existente pode ser
   atualizado. A API precisa decidir entre manter o primeiro valor, atualizar
   ou retornar conflito; não deve fazer isso silenciosamente.
2. **Reenvio de Exame:** a unicidade protege o banco, mas o desafio não define
   se evento idêntico é idempotente nem como tratar campos divergentes.
3. **Integração parcial:** a escolha atual é marcar Pedido integrado com pelo
   menos um Exame, pois não há estado parcial no enunciado. Se a avaliação
   exigir todos os itens integrados, a semântica deverá ser alterada de forma
   explícita.
4. **Normalização de chaves:** antes de implementar DTOs, deve-se fixar se
   espaços são removidos e se comparações de códigos/accession são estritamente
   sensíveis a maiúsculas e minúsculas. A regra inicial recomendada é
   normalização mínima (trim) e comparação textual exata.

As dúvidas foram mantidas visíveis para evitar que a implementação altere
silenciosamente as regras de <code>docs/desafio.md</code>.
