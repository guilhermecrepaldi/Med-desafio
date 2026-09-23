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

    await api.get('/pedidos/inexistente').expect(404);
    await api.get('/documentos/inexistente').expect(404);
    await api.get('/exames/inexistente').expect(404);
  });

  it('expõe healthcheck e Swagger para operação e auditoria', async () => {
    const api = request(app.getHttpServer());

    await api.get('/health').expect(200).expect({ status: 'ok' });
    await api.get('/docs-json').expect(200).expect('content-type', /json/);
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
