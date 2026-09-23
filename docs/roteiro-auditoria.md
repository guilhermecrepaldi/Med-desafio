# Roteiro auditável de conferência

## Objetivo

Este roteiro permite conferir, de forma reproduzível, se o projeto atende ao
desafio sem confundir o que já foi decidido em documentação com o que já foi
implementado. Ele serve tanto para revisão manual quanto para orientar os
testes automatizados futuros.

O enunciado em [desafio.md](desafio.md) é a fonte das regras funcionais. Este
arquivo não adiciona requisitos de negócio.

## Legenda de estado

| Marca | Significado |
| --- | --- |
| ✅ Documentado | Pode ser verificado agora nos arquivos versionados. |
| ⬜ Pendente de implementação | É uma regra definida, mas ainda não há código executável. |
| ✅ Implementado | Só será usada quando houver evidência por teste, comando e resultado. |

## Auditoria 0 — confirmar o ponto de partida

Execute estes comandos na raiz do repositório:

~~~bash
git status --short --branch
git log --oneline -5
git diff --check
rg --files --hidden -g '!.git/**'
~~~

Resultado esperado no checkpoint atual:

1. A branch está limpa e possui os commits de documentação à frente de
   <code>origin/main</code> enquanto não houver push.
2. Existem <code>README.md</code> e os documentos em <code>docs/</code>.
3. Não existem ainda <code>src/</code>, <code>package.json</code>,
   <code>Dockerfile</code> ou <code>docker-compose.yml</code>.
4. Portanto, qualquer afirmação de API funcionando, Docker subindo ou testes
   passando seria incorreta neste momento.

## Auditoria 1 — rastrear cada requisito do desafio

| ID | Requisito | Evidência atual | Estado atual |
| --- | --- | --- | --- |
| RF-01 | Salvar Pedido por <code>CodigoPedido</code>. | Modelo e cenário funcional. | ✅ Documentado / ⬜ executável |
| RF-02 | Adicionar somente ItemPedido novo no reenvio. | Constraint e Cenário D. | ✅ Documentado / ⬜ executável |
| RF-03 | Integrar Pedido por <code>AccessionNumber</code>. | Modelo e Cenários A e B. | ✅ Documentado / ⬜ executável |
| RF-04 | Rejeitar Documento duplicado por código + pedido. | Constraint e Cenário E. | ✅ Documentado / ⬜ executável |
| RF-05 | Vincular Documento aos Exames aplicáveis do Pedido. | Tabela de associação e Cenário A. | ✅ Documentado / ⬜ executável |
| RF-06 | Receber Exame e reconciliar pendências. | ReconciliationService e Cenário A. | ✅ Documentado / ⬜ executável |
| RF-07 | Expor os seis endpoints obrigatórios. | README e Nível 1. | ✅ Documentado / ⬜ executável |
| RT-01 | Node.js, REST, persistência, Docker, README, erros, Jest, Swagger e logs. | Níveis de entrega. | ⬜ Pendente de implementação |
| RT-02 | PostgreSQL, NestJS, TypeORM, migrations e Compose. | Decisões e Nível 2. | ✅ Documentado / ⬜ executável |
| RT-03 | Não usar cron na primeira versão. | Decisão técnica. | ✅ Documentado |

Para conferir as fontes desta tabela:

~~~bash
rg -n "POST /pedidos|POST /documentos|POST /exames|GET /pedidos" README.md docs
rg -n "cron|ReconciliationService|409 Conflict" docs
~~~

## Auditoria 2 — conferir a modelagem antes de escrever código

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

## Auditoria 3 — cenários funcionais que a API deverá provar

Use estes dados de referência depois de a API existir:

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

## Auditoria 4 — comandos de execução, depois da implementação

Os comandos abaixo são a evidência esperada do Nível 1 ou 2. Eles ainda não
devem funcionar enquanto não existirem <code>package.json</code>, Docker e
migrations.

~~~bash
docker compose up --build
npm run migration:run
npm test
npm run test:e2e
~~~

A entrega só poderá ser marcada como implementada quando o README passar a
explicar os nomes reais dos scripts, pré-requisitos, portas e variáveis de
ambiente sem segredos.

## Auditoria 5 — validação HTTP manual, depois da implementação

Defina a URL apenas no terminal de auditoria:

~~~bash
AUDIT_API_URL=http://localhost:3000
~~~

Use os payloads do cenário anterior para enviar os três POSTs na ordem de cada
cenário. Após cada escrita, consulte:

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

Os contratos detalhados de resposta serão definidos no Swagger durante a
implementação. Até lá, não há motivo para inventar corpos de resposta.

## Auditoria 6 — validar o banco, depois da migration

No container PostgreSQL, confira constraints antes de testar fluxos:

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

Ao concluir uma conferência, registre no pull request, issue ou commit:

1. data e commit auditado;
2. comando executado;
3. resultado obtido;
4. cenário validado;
5. pendência ou decisão nova, caso exista.

Não marque uma caixa como concluída por existir apenas documentação. A marca
<code>✅ Implementado</code> exige evidência executável.
