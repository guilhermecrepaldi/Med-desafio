import { ApiProperty } from '@nestjs/swagger';

export class ExameVinculadoResponseDto {
  @ApiProperty({ example: '930' })
  AccessionNumber!: string;

  @ApiProperty({ example: 'CR' })
  Modalidade!: string;

  @ApiProperty({ example: 'NOVO' })
  Status!: string;
}

export class DocumentoResponseDto {
  @ApiProperty({ example: '251', description: 'Código externo, sempre retornado como texto.' })
  CodigoDocumento!: string;

  @ApiProperty({ example: '616', description: 'Código do pedido, sempre retornado como texto.' })
  CodigoPedido!: string;

  @ApiProperty({ example: 'PEDIDO' })
  NomeDocumento!: string;

  @ApiProperty({ example: 'base64' })
  Documento!: string;

  @ApiProperty({ example: false })
  Integrado!: boolean;

  @ApiProperty({ type: [ExameVinculadoResponseDto] })
  Exames!: ExameVinculadoResponseDto[];

  @ApiProperty({ example: '2026-09-23T12:00:00.000Z' })
  CreatedAt!: string;

  @ApiProperty({ example: '2026-09-23T12:00:00.000Z' })
  UpdatedAt!: string;
}

export const DOCUMENTO_RESPONSE_PENDING_EXAMPLE: DocumentoResponseDto = {
  CodigoDocumento: '251',
  CodigoPedido: '616',
  NomeDocumento: 'PEDIDO',
  Documento: 'base64',
  Integrado: false,
  Exames: [],
  CreatedAt: '2026-09-24T12:00:00.000Z',
  UpdatedAt: '2026-09-24T12:00:00.000Z',
};

export const DOCUMENTO_RESPONSE_INTEGRATED_EXAMPLE: DocumentoResponseDto = {
  ...DOCUMENTO_RESPONSE_PENDING_EXAMPLE,
  Integrado: true,
  Exames: [
    {
      AccessionNumber: '930',
      Modalidade: 'CR',
      Status: 'NOVO',
    },
  ],
  UpdatedAt: '2026-09-24T12:01:00.000Z',
};
