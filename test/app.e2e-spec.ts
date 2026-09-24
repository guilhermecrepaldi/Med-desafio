import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { configureApplication } from '../src/app-configuration';
import { AppModule } from '../src/app.module';
import { createDatabaseOptions } from '../src/database/database-options';
import { ReconciliationService } from '../src/integration';

const patientName = 'PACIENTE DE TESTE';

function pedido(codigoPedido = '616', accessionNumbers: string[] = ['930']) {
  return {
    CodigoPedido: codigoPedido,
    NomePaciente: patientName,
    DataNascimento: '19970601',
    Sexo: 'M',
    CodUnidade: '104',
    Exames: accessionNumbers.map((accessionNumber, index) => ({
      CodigoItemPedido: String(930 + index),
      AccessionNumber: accessionNumber,
      Modalidade: 'CR',
      NomeProcedimento: `PROCEDIMENTO ${accessionNumber}`,
    })),
  };
}

function documento(codigoDocumento = '251', codigoPedido = '616') {
  return {
    CodigoDocumento: codigoDocumento,
    CodigoPedido: codigoPedido,
    NomeDocumento: 'PEDIDO',
    Documento: 'base64',
  };
}

function exame(accessionNumber = '930') {
  return {
    AccessionNumber: accessionNumber,
    NomePaciente: patientName,
    Modalidade: 'CR',
    Status: 'NOVO',
  };
}

describe('Med-desafio (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let appStarted = false;

  beforeAll(async () => {
    const migrationDataSource = new DataSource(createDatabaseOptions());
    await migrationDataSource.initialize();
    await migrationDataSource.runMigrations();
    await migrationDataSource.destroy();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
    appStarted = true;
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE "documentos_exames", "documentos", "itens_pedido", "exames", "pedidos" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    if (appStarted) {
      await app.close();
    }
  });

  it('persiste pedido sem exame e mantém estado pendente', async () => {
    const api = request(app.getHttpServer());

    await api.post('/pedidos').send(pedido()).expect(201).expect('x-request-id', /.+/);

    const response = await api.get('/pedidos/616').expect(200);

    expect(response.body).toMatchObject({
      CodigoPedido: '616',
      Integrado: false,
      Exames: [expect.objectContaining({ AccessionNumber: '930' })],
    });
  });

  it('persiste documento em pedido pendente e o integra quando o exame chega', async () => {
    const api = request(app.getHttpServer());

    await api.post('/pedidos').send(pedido()).expect(201);
    const documentoPendente = await api.post('/documentos').send(documento()).expect(201);
    expect(documentoPendente.body).toMatchObject({ Integrado: false, Exames: [] });

    await api.post('/exames').send(exame()).expect(201);

    const pedidoIntegrado = await api.get('/pedidos/616').expect(200);
    const documentosIntegrados = await api.get('/documentos/616').expect(200);
    const exameIntegrado = await api.get('/exames/930').expect(200);

    expect(pedidoIntegrado.body.Integrado).toBe(true);
    expect(documentosIntegrados.body).toEqual([
      expect.objectContaining({
        Integrado: true,
        Exames: [expect.objectContaining({ AccessionNumber: '930' })],
      }),
    ]);
    expect(exameIntegrado.body.Documentos).toEqual([
      expect.objectContaining({ CodigoDocumento: '251', CodigoPedido: '616' }),
    ]);
  });

  it('integra pedido quando o exame chegou antes e vincula documento posterior', async () => {
    const api = request(app.getHttpServer());

    await api.post('/exames').send(exame()).expect(201);
    await api.post('/pedidos').send(pedido()).expect(201);

    const pedidoIntegrado = await api.get('/pedidos/616').expect(200);
    expect(pedidoIntegrado.body.Integrado).toBe(true);

    const documentoIntegrado = await api.post('/documentos').send(documento()).expect(201);
    expect(documentoIntegrado.body).toMatchObject({
      Integrado: true,
      Exames: [expect.objectContaining({ AccessionNumber: '930' })],
    });
  });

  it('aceita documento antes do pedido e o integra quando o exame chega', async () => {
    const api = request(app.getHttpServer());

    await api.post('/documentos').send(documento()).expect(201);

    const pendente = await api.get('/documentos/616').expect(200);
    expect(pendente.body).toEqual([
      expect.objectContaining({ CodigoDocumento: '251', Integrado: false, Exames: [] }),
    ]);

    await api.post('/pedidos').send(pedido()).expect(201);
    await api.post('/exames').send(exame()).expect(201);

    const documentos = await api.get('/documentos/616').expect(200);
    expect(documentos.body).toEqual([
      expect.objectContaining({
        CodigoDocumento: '251',
        Integrado: true,
        Exames: [expect.objectContaining({ AccessionNumber: '930' })],
      }),
    ]);
  });

  it('reconcilia quando documento e exame chegam antes do pedido', async () => {
    const api = request(app.getHttpServer());

    await api.post('/documentos').send(documento()).expect(201);
    await api.post('/exames').send(exame()).expect(201);
    await api.post('/pedidos').send(pedido()).expect(201);

    const pedidoIntegrado = await api.get('/pedidos/616').expect(200);
    const documentos = await api.get('/documentos/616').expect(200);

    expect(pedidoIntegrado.body.Integrado).toBe(true);
    expect(documentos.body).toEqual([
      expect.objectContaining({
        Integrado: true,
        Exames: [expect.objectContaining({ AccessionNumber: '930' })],
      }),
    ]);
  });

  it('reenvia pedido com item novo sem duplicar o item existente', async () => {
    const api = request(app.getHttpServer());

    await api.post('/pedidos').send(pedido()).expect(201);
    const replay = await api
      .post('/pedidos')
      .send(pedido('616', ['930', '931']))
      .expect(200);

    expect(replay.body.Exames).toHaveLength(2);
    expect(
      replay.body.Exames.map((item: { AccessionNumber: string }) => item.AccessionNumber).sort(),
    ).toEqual(['930', '931']);
  });

  it('rejeita reenvios de pedido com cabeçalho ou item divergente', async () => {
    const api = request(app.getHttpServer());

    await api.post('/pedidos').send(pedido()).expect(201);
    await api
      .post('/pedidos')
      .send({ ...pedido(), NomePaciente: 'OUTRO PACIENTE' })
      .expect(409);
    await api
      .post('/pedidos')
      .send({
        ...pedido(),
        Exames: [
          {
            ...pedido().Exames[0],
            AccessionNumber: 'DIVERGENTE',
          },
        ],
      })
      .expect(409);

    const persistido = await api.get('/pedidos/616').expect(200);
    expect(persistido.body).toMatchObject({
      NomePaciente: patientName,
      Exames: [expect.objectContaining({ AccessionNumber: '930' })],
    });
  });

  it('rejeita documento duplicado com 409 e preserva o requestId recebido', async () => {
    const api = request(app.getHttpServer());

    await api.post('/documentos').send(documento()).expect(201);
    const duplicate = await api
      .post('/documentos')
      .set('x-request-id', 'auditoria-documento-duplicado')
      .send(documento())
      .expect(409);

    expect(duplicate.headers['x-request-id']).toBe('auditoria-documento-duplicado');
    expect(duplicate.body).toMatchObject({
      errorCode: 'HTTP_409',
      requestId: 'auditoria-documento-duplicado',
    });
    expect((await api.get('/documentos/616').expect(200)).body).toHaveLength(1);
  });

  it('liga múltiplos documentos a todos os exames correlacionados sem duplicar vínculos', async () => {
    const api = request(app.getHttpServer());

    await api
      .post('/pedidos')
      .send(pedido('700', ['A-1', 'A-2']))
      .expect(201);
    await api.post('/documentos').send(documento('D-1', '700')).expect(201);
    await api.post('/documentos').send(documento('D-2', '700')).expect(201);
    await api.post('/exames').send(exame('A-1')).expect(201);
    await api.post('/exames').send(exame('A-2')).expect(201);
    await api.post('/exames').send(exame('A-2')).expect(200);

    const documentos = await api.get('/documentos/700').expect(200);
    expect(documentos.body).toHaveLength(2);
    for (const documentoIntegrado of documentos.body as Array<{
      Exames: unknown[];
      Integrado: boolean;
    }>) {
      expect(documentoIntegrado.Integrado).toBe(true);
      expect(documentoIntegrado.Exames).toHaveLength(2);
    }

    const links = await dataSource.query(
      'SELECT COUNT(*)::int AS quantidade FROM "documentos_exames"',
    );
    expect(links[0]).toEqual({ quantidade: 4 });

    const exameComDocumentos = await api.get('/exames/A-2').expect(200);
    expect(exameComDocumentos.body.Documentos).toHaveLength(2);
  });

  it('torna reenvio idêntico de exame idempotente e rejeita conteúdo divergente', async () => {
    const api = request(app.getHttpServer());

    await api.post('/exames').send(exame()).expect(201);
    await api.post('/exames').send(exame()).expect(200);
    await api
      .post('/exames')
      .send({ ...exame(), Status: 'FINALIZADO' })
      .expect(409);
  });

  it('mantém timestamps quando um reenvio idêntico não produz mudança de estado', async () => {
    const api = request(app.getHttpServer());

    await api.post('/exames').send(exame()).expect(201);
    const pedidoIntegrado = await api.post('/pedidos').send(pedido()).expect(201);
    const documentoIntegrado = await api.post('/documentos').send(documento()).expect(201);

    const replayPedido = await api.post('/pedidos').send(pedido()).expect(200);
    const replayExame = await api.post('/exames').send(exame()).expect(200);
    const documentosDepoisDoReplay = await api.get('/documentos/616').expect(200);

    expect(replayPedido.body.UpdatedAt).toBe(pedidoIntegrado.body.UpdatedAt);
    expect(replayExame.body.UpdatedAt).toBeDefined();
    expect(documentosDepoisDoReplay.body[0].UpdatedAt).toBe(documentoIntegrado.body.UpdatedAt);
    expect(documentosDepoisDoReplay.body[0].Exames).toHaveLength(1);
  });

  it('padroniza erros de validação e GET inexistente', async () => {
    const api = request(app.getHttpServer());

    await api
      .post('/pedidos')
      .send({ ...pedido(), DataNascimento: '19970229' })
      .expect(400);

    const invalid = await api
      .post('/pedidos')
      .send({ ...pedido(), DataNascimento: '19970229', campoNaoPermitido: true })
      .expect(400);
    expect(invalid.body).toMatchObject({
      statusCode: 400,
      errorCode: 'HTTP_400',
      requestId: expect.any(String),
    });

    await api
      .post('/documentos')
      .send({ ...documento(), Documento: '   ' })
      .expect(400);

    await api.get('/pedidos/inexistente').expect(404);
    await api.get('/documentos/inexistente').expect(404);
    await api.get('/exames/inexistente').expect(404);
  });

  it('expõe healthcheck e contratos Swagger completos para operação e auditoria', async () => {
    const api = request(app.getHttpServer());

    await api.get('/health').expect(200).expect({ status: 'ok' });
    const swagger = await api.get('/docs-json').expect(200).expect('content-type', /json/);
    const pedidoPost = swagger.body.paths['/pedidos'].post;
    const documentosGet = swagger.body.paths['/documentos/{codigoPedido}'].get;
    const operacoesDocumentadas = [
      { operation: pedidoPost, statuses: ['200', '201', '400', '409', '500'] },
      {
        operation: swagger.body.paths['/pedidos/{codigoPedido}'].get,
        statuses: ['200', '400', '404', '500'],
      },
      {
        operation: swagger.body.paths['/documentos'].post,
        statuses: ['201', '400', '409', '500'],
      },
      { operation: documentosGet, statuses: ['200', '400', '404', '500'] },
      {
        operation: swagger.body.paths['/exames'].post,
        statuses: ['200', '201', '400', '409', '500'],
      },
      {
        operation: swagger.body.paths['/exames/{accessionNumber}'].get,
        statuses: ['200', '400', '404', '500'],
      },
      { operation: swagger.body.paths['/health'].get, statuses: ['200', '503'] },
    ];

    for (const { operation, statuses } of operacoesDocumentadas) {
      expect(operation.parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            in: 'header',
            name: 'x-request-id',
            required: false,
            schema: expect.objectContaining({ type: 'string' }),
          }),
        ]),
      );

      for (const status of statuses) {
        expect(operation.responses[status]).toMatchObject({
          headers: {
            'x-request-id': {
              schema: { type: 'string' },
            },
          },
        });
        expect(operation.responses[status].content['application/json'].example).toBeDefined();
      }
    }

    expect(pedidoPost.responses['201']).toMatchObject({
      content: {
        'application/json': {
          example: expect.objectContaining({ CodigoPedido: '616', Integrado: false }),
        },
      },
    });
    expect(pedidoPost.responses['409'].content['application/json'].example).toMatchObject({
      statusCode: 409,
      errorCode: 'HTTP_409',
    });
    expect(documentosGet.responses['200'].content['application/json'].example).toEqual([
      expect.objectContaining({ CodigoDocumento: '251', Integrado: true }),
    ]);
    const identificadoresDeEntrada = [
      ['CreatePedidoDto', 'CodigoPedido'],
      ['CreatePedidoDto', 'DataNascimento'],
      ['CreatePedidoDto', 'CodUnidade'],
      ['CreateItemPedidoDto', 'CodigoItemPedido'],
      ['CreateItemPedidoDto', 'AccessionNumber'],
      ['CreateDocumentoDto', 'CodigoDocumento'],
      ['CreateDocumentoDto', 'CodigoPedido'],
      ['CreateExameDto', 'AccessionNumber'],
    ];

    for (const [schemaName, propertyName] of identificadoresDeEntrada) {
      expect(swagger.body.components.schemas[schemaName].properties[propertyName].oneOf).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'string' }),
          expect.objectContaining({ type: 'number' }),
        ]),
      );
    }

    expect(swagger.body.components.schemas.PedidoResponseDto.properties.CodigoPedido).toMatchObject(
      {
        type: 'string',
      },
    );
  });

  it('faz rollback do pedido quando a reconciliação falha dentro da transação', async () => {
    const api = request(app.getHttpServer());
    const reconciliationService = app.get(ReconciliationService);
    const reconciliationSpy = jest
      .spyOn(reconciliationService, 'reconcilePedido')
      .mockRejectedValueOnce(new Error('falha simulada na reconciliação'));

    await api.post('/pedidos').send(pedido('rollback')).expect(500);
    await api.get('/pedidos/rollback').expect(404);

    reconciliationSpy.mockRestore();
  });
});
