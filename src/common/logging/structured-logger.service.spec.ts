import { RequestContextService } from '../request-context/request-context.service';
import { StructuredLogger } from './structured-logger.service';

describe('StructuredLogger', () => {
  const requestContext = new RequestContextService();
  const logger = new StructuredLogger(requestContext);
  let writeSpy: jest.SpyInstance;

  beforeEach(() => {
    writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('registra metadados úteis e redige o conteúdo de documentos', () => {
    requestContext.run({ requestId: 'trace-123' }, () => {
      logger.info('documento.recebido', {
        codigoDocumento: 'DOC-1',
        accessionNumber: 'ACC-1',
        documento: 'conteudo-base64-que-nao-deve-ser-registrado',
        nested: {
          Documento: 'outro-conteudo-sensivel',
        },
      });
    });

    const [output] = writeSpy.mock.calls[0] ?? [];
    const entry = JSON.parse(String(output)) as unknown;

    expect(entry).toMatchObject({
      accessionNumber: 'ACC-1',
      codigoDocumento: 'DOC-1',
      event: 'documento.recebido',
      level: 'info',
      requestId: 'trace-123',
      documento: '[REDACTED]',
      nested: {
        Documento: '[REDACTED]',
      },
    });
    expect(String(output)).not.toContain('conteudo-base64-que-nao-deve-ser-registrado');
  });
});
