# Roteiro auditável de conferência

## Objetivo

Este roteiro permite conferir, de forma reproduzível, se o projeto atende ao
desafio sem confundir código implementado com evidência realmente executada.
Ele serve tanto para revisão manual quanto para orientar os testes
automatizados e o smoke test.

O enunciado em [desafio.md](desafio.md) é a fonte das regras funcionais. Este
arquivo não adiciona requisitos de negócio. A
[matriz de auditoria da entrega](auditoria-entrega.md) registra o resultado
mais recente dos comandos executados e dos bloqueios externos; ela é a
referência para não transformar uma validação ainda não executada em aprovação.

## Legenda de estado

| Marca | Significado |
| --- | --- |
| ✅ PASS executado | O comando ou teste foi concluído e seu resultado está registrado na matriz. |
| 🟡 Implementado, sem execução final | Há código e testes, mas a evidência dependente de ambiente ainda não foi executada. |
| 🚫 Bloqueado externamente | A validação não pôde ser executada por uma limitação registrada; não equivale a aprovação. |

## Auditoria 0 — confirmar o estado auditado

Execute estes comandos na raiz do repositório:

~~~bash
git status --short --branch
git log --oneline -5
git diff --check
rg --files --hidden -g '!.git/**'
npm run lint
npm run format:check
npm test
npm run build
docker compose config
~~~

Confirme que existem, entre outros, os seguintes artefatos:

1. <code>src/</code>, <code>test/</code>, <code>package.json</code>,
   <code>Dockerfile</code>, <code>docker-compose.yml</code> e
   <code>.env.example</code>;
2. entidades e migration em <code>src/database/</code>;
3. controllers, DTOs e serviços em <code>src/pedidos</code>,
   <code>src/documentos</code> e <code>src/exames</code>;
4. reconciliação centralizada em <code>src/integration/</code>;
5. testes unitários em <code>src/</code> e E2E em <code>test/</code>.

O resultado histórico dos comandos de lint, formatação, unitários, build e
validação estática do Compose está em
[auditoria-entrega.md](auditoria-entrega.md). Antes de encerrar uma nova
auditoria, atualize essa matriz com a saída observada. A existência dos
artefatos acima **não** comprova por si só PostgreSQL, migrations, E2E, Docker
em execução ou smoke HTTP.

## Auditoria 1 — rastrear cada requisito do desafio

| ID | Requisito | Evidência atual | Estado atual |
| --- | --- | --- | --- |
| RF-01 | Salvar Pedido por <code>CodigoPedido</code>. | <code>PedidosService</code>, entidade e migration; E2E de Pedido/reenvio. | 🟡 Implementado; E2E depende de PostgreSQL. |
| RF-02 | Adicionar somente ItemPedido novo no reenvio. | Constraint e Cenário D; serviço de Pedido. | 🟡 Implementado; E2E depende de PostgreSQL. |
| RF-03 | Integrar Pedido por <code>AccessionNumber</code>. | <code>ReconciliationService</code>; Cenários A, B e C. | 🟡 Implementado; E2E depende de PostgreSQL. |
| RF-04 | Rejeitar Documento duplicado por código + pedido. | Constraint, serviço de Documento e Cenário E. | 🟡 Implementado; E2E depende de PostgreSQL. |
| RF-05 | Vincular Documento aos Exames aplicáveis do Pedido. | Entidade de associação e <code>ReconciliationService</code>. | 🟡 Implementado; E2E depende de PostgreSQL. |
| RF-06 | Receber Exame e reconciliar pendências. | Serviço de Exame e <code>ReconciliationService</code>. | 🟡 Implementado; E2E depende de PostgreSQL. |
| RF-07 | Expor os seis endpoints obrigatórios. | Controllers, DTOs, Swagger e testes E2E. | 🟡 Implementado; smoke HTTP depende da API em execução. |
| RT-01 | Node.js, REST, persistência, Docker, README, erros, Jest, Swagger e logs. | NestJS, TypeORM, Docker, README, filtro global, testes, Swagger e logs estruturados. | Ver [matriz](auditoria-entrega.md). |
| RT-02 | PostgreSQL, NestJS, TypeORM, migrations e Compose. | DataSource, migration inicial e Compose. | 🟡 Implementado; execução PostgreSQL bloqueada no ambiente atual. |
| RT-03 | Não usar cron na primeira versão. | Reconciliação síncrona na escrita, sem scheduler. | ✅ Verificável no código. |

Para conferir as fontes desta tabela:

~~~bash
rg -n "POST /pedidos|POST /documentos|POST /exames|GET /pedidos" README.md docs
rg -n "cron|ReconciliationService|409 Conflict" docs
~~~

## Auditoria 2 — conferir a modelagem e sua materialização no banco

Leia, nesta ordem:

1. [desafio.md](desafio.md): regra funcional original.
2. [dominio.md](dominio.md): nomes e limites do domínio.
3. [modelo-dados.md](modelo-dados.md): diagrama ER e modelo físico.
4. [decisoes-tecnicas.md](decisoes-tecnicas.md): premissas e dúvidas abertas.

Confirme os seguintes pontos:

| Item auditado | Evidência que deve existir |
| --- | --- |
| Pedido e ItemPedido | Relação 1:N e <code>UNIQUE(pedido_id, codigo_item_pedido)</code>. |
| ItemPedido e Exame | Entidades diferentes, sem FK direta; correlação por <code>accession_number</code>. |
| Exame | <code>UNIQUE(accession_number)</code> como premissa limitada ao desafio. |
| Documento | Regra de unicidade pelo código de pedido de referência e código de documento. |
| Documento antes de Pedido | <code>pedido_id</code> pode ficar nulo enquanto <code>codigo_pedido_referencia</code> mantém a chave de negócio. |
| Documento e Exame | Tabela N:N com PK composta <code>(documento_id, exame_id)</code>. |
| Índices | Busca por <code>itens_pedido.accession_number</code> e navegação inversa por <code>documentos_exames.exame_id</code>. |
| Estados | Pedido integrado se existir ao menos um Exame correspondente; Documento integrado se existir ao menos um vínculo. |

Comandos rápidos de conferência documental:

~~~bash
rg -n "UNIQUE \(pedido_id, codigo_item_pedido\)|UNIQUE \(accession_number\)" docs/modelo-dados.md
rg -n "codigo_pedido_referencia|documentos_exames|ReconciliationService" docs/modelo-dados.md
~~~

## Auditoria 3 — cenários funcionais que a API deve provar

Use estes dados de referência contra a API em execução. Os E2E reproduzem os
fluxos principais, mas a inspeção manual abaixo continua sendo a evidência do
smoke test final.

~~~json
{
  "pedido": {
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
  },
  "documento": {
    "CodigoDocumento": 251,
    "CodigoPedido": 616,
    "NomeDocumento": "PEDIDO",
    "Documento": "base64"
  },
  "exame": {
    "AccessionNumber": "930",
    "NomePaciente": "ALEFHER MONTONI DE ALMEIDA",
    "Modalidade": "CR",
    "Status": "NOVO"
  }
}
~~~

> **Nota de auditoria:** o exemplo de Pedido do enunciado usa
> <code>CodigoPedido = 616</code>, enquanto o exemplo isolado de Documento usa
> <code>CodigoPedido = 615</code>. Eles devem ser tratados como ilustrações
> independentes e preservados como estão em <code>desafio.md</code>. Nos
> cenários de vínculo deste roteiro, os códigos são iguais deliberadamente para
> exercer a regra de integração.

### Cenário A — Pedido, Documento, Exame

1. Enviar <code>POST /pedidos</code> com o pedido.
2. Consultar <code>GET /pedidos/616</code>.
3. Confirmar pedido persistido e <code>integrado = false</code>.
4. Enviar <code>POST /documentos</code>.
5. Consultar <code>GET /documentos/616</code>.
6. Confirmar documento persistido, sem vínculo e <code>integrado = false</code>.
7. Enviar <code>POST /exames</code>.
8. Consultar os três GETs.
9. Confirmar pedido integrado, documento integrado e um vínculo
   Documento–Exame.

### Cenário B — Exame, Pedido, Documento

1. Enviar o Exame primeiro.
2. Confirmar que ele existe mesmo sem Pedido.
3. Enviar o Pedido com o mesmo <code>AccessionNumber</code>.
4. Confirmar que o Pedido já nasce integrado.
5. Enviar o Documento.
6. Confirmar que ele é vinculado imediatamente ao Exame já encontrado.

### Cenário C — Documento, Pedido, Exame

1. Enviar Documento com <code>CodigoPedido = 616</code> antes do Pedido.
2. Consultar <code>GET /documentos/616</code> e confirmar que ele foi
   preservado como pendente.
3. Enviar Pedido e confirmar que o documento é associado ao Pedido.
4. Enviar Exame e confirmar o vínculo Documento–Exame.

Este cenário verifica a extensão documentada para chegada totalmente fora de
ordem. Ele não deve criar um Pedido incompleto só para aceitar o Documento.

### Cenário D — reenvio de Pedido com item novo

1. Enviar o Pedido original.
2. Reenviar o mesmo Pedido incluindo o item <code>930</code> e um novo item,
   por exemplo <code>931</code>.
3. Consultar <code>GET /pedidos/616</code>.
4. Confirmar exatamente dois itens: <code>930</code> e <code>931</code>, sem
   repetição de <code>930</code>.

### Cenário E — Documento duplicado

1. Enviar o Documento original.
2. Enviar novamente a mesma combinação
   <code>CodigoDocumento = 251</code> e <code>CodigoPedido = 616</code>.
3. Confirmar resposta <code>409 Conflict</code>.
4. Confirmar no GET e no banco que continua existindo apenas um documento.

## Auditoria 4 — comandos de execução real

Os comandos abaixo verificam uma instalação que parte de um banco disponível.
Os resultados já executados e os bloqueios do ambiente atual estão registrados
em [auditoria-entrega.md](auditoria-entrega.md). Execute-os novamente em um
ambiente com acesso ao daemon Docker antes de considerar a entrega aprovada.

~~~bash
npm ci
npm run lint
npm run format:check
npm test
npm run build
docker compose config
docker compose up --build -d --wait
docker compose ps
npm run migration:show
npm run test:e2e
curl -fsS http://localhost:3000/health
curl -fsS http://localhost:3000/docs-json > /dev/null
~~~

Para auditar uma instalação sem dados anteriores, use um ambiente Docker
isolado e, somente se puder descartar o volume daquele ambiente, execute:

~~~bash
docker compose down -v
docker compose up --build -d --wait
docker compose ps
npm run test:e2e
~~~

<code>docker compose down -v</code> remove o volume PostgreSQL do projeto;
não o use contra dados que precisem ser preservados. O Compose inicia a API
com migrations habilitadas. Para uma execução local sem o container da API,
suba apenas <code>db</code> e rode <code>npm run migration:run</code> antes de
<code>npm run start:dev</code>, conforme o README.

## Auditoria 5 — validação HTTP manual

Defina a URL apenas no terminal de auditoria:

~~~bash
AUDIT_API_URL=http://localhost:3000
~~~

Use os payloads do cenário anterior para enviar os três POSTs na ordem de cada
cenário. Envie um <code>x-request-id</code> conhecido em pelo menos uma
requisição e confirme que o mesmo valor volta no header de resposta. Após cada
escrita, consulte:

~~~bash
curl "$AUDIT_API_URL/pedidos/616"
curl "$AUDIT_API_URL/documentos/616"
curl "$AUDIT_API_URL/exames/930"
~~~

A auditoria deve avaliar o estado final, não apenas o código HTTP de sucesso:

- Pedido possui os itens corretos e o estado de integração esperado.
- Documento é único e só fica integrado quando houver vínculo.
- Exame pode existir sem Pedido.
- Vínculos não se repetem quando a reconciliação é disparada mais de uma vez.

Os contratos detalhados, exemplos, status HTTP e erros estão em
<code>/docs</code> e em <code>/docs-json</code>. Compare a resposta com os
DTOs publicados pelo Swagger; não trate apenas um <code>2xx</code> como
aprovação do cenário.

## Auditoria 6 — validar o banco depois das migrations

No container PostgreSQL, confira constraints antes de testar fluxos. O comando
abaixo abre uma sessão no banco padrão do Compose; ajuste as variáveis caso a
auditoria use outra configuração:

~~~bash
docker compose exec db psql -U postgres -d med_desafio
~~~

Então execute:

~~~sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN (
  'pedidos'::regclass,
  'itens_pedido'::regclass,
  'exames'::regclass,
  'documentos'::regclass,
  'documentos_exames'::regclass
)
ORDER BY conrelid::regclass::text, conname;
~~~

Após o Cenário A, consulte:

~~~sql
SELECT p.codigo_pedido, p.integrado, i.codigo_item_pedido, i.accession_number
FROM pedidos p
JOIN itens_pedido i ON i.pedido_id = p.id
WHERE p.codigo_pedido = '616';

SELECT d.codigo_documento, d.integrado, e.accession_number
FROM documentos d
LEFT JOIN documentos_exames de ON de.documento_id = d.id
LEFT JOIN exames e ON e.id = de.exame_id
WHERE d.codigo_pedido_referencia = '616';
~~~

Resultado esperado:

- uma linha de Pedido;
- um ItemPedido para o Cenário A;
- um Documento;
- um Exame;
- um vínculo em <code>documentos_exames</code>;
- ambos os estados <code>integrado</code> verdadeiros após a chegada do Exame.

## Critérios de aceite para fechar cada nível

As caixas abaixo são um registro de aceite para a próxima auditoria. O estado
local já observado deve ser consultado na
[matriz de auditoria da entrega](auditoria-entrega.md). Em especial, não marque
Docker, migrations, E2E ou smoke HTTP como aprovados enquanto esses comandos
não tiverem sido concluídos em PostgreSQL acessível.

### Nível 1

- [ ] Docker sobe aplicação e PostgreSQL.
- [ ] Todas as migrations aplicam em banco vazio.
- [ ] Seis endpoints obrigatórios respondem.
- [ ] Cenários A, B, D e E passam; Cenário C passa se mantida a decisão de
  aceitar Documento antes de Pedido.
- [ ] Jest executa os testes exigidos.
- [ ] Swagger e logs estão acessíveis.
- [ ] README permite outra pessoa repetir a validação.

### Nível 2

- [ ] Controllers não contêm a regra de reconciliação.
- [ ] Escritas e reconciliação sensíveis são transacionais.
- [ ] Constraints, índices e erros de duplicidade são testados.
- [ ] Há testes unitários e E2E para todas as ordens de chegada.
- [ ] Migrations substituem <code>synchronize</code>.
- [ ] Reenvios não criam itens, documentos ou vínculos duplicados.

### Nível 3

- [ ] Logs possuem <code>requestId</code> ou <code>correlationId</code>.
- [ ] Healthcheck, lint, formatação e cobertura são verificáveis.
- [ ] CI executa lint, testes e build.
- [ ] Estratégia de recuperação/reprocessamento está documentada, sem exigir
  cron na primeira versão.

## Como registrar a auditoria

Ao concluir uma conferência, atualize
[auditoria-entrega.md](auditoria-entrega.md) e registre no pull request, issue
ou commit:

1. data e commit auditado;
2. comando executado;
3. resultado obtido;
4. cenário validado;
5. pendência ou decisão nova, caso exista.

Não marque uma caixa como concluída por existir apenas documentação ou código.
Um item só recebe <code>✅ PASS executado</code> após haver comando, resultado
e cenário correspondentes registrados.
