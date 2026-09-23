import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateDocumentoDto } from './create-documento.dto';

describe('CreateDocumentoDto', () => {
  it('rejeita conteúdo de documento formado apenas por espaços', async () => {
    const dto = plainToInstance(CreateDocumentoDto, {
      CodigoDocumento: '251',
      CodigoPedido: '616',
      NomeDocumento: 'PEDIDO',
      Documento: '   ',
    });

    const errors = await validate(dto);

    expect(dto.Documento).toBe('');
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'Documento',
          constraints: expect.objectContaining({ isNotEmpty: expect.any(String) }),
        }),
      ]),
    );
  });
});
