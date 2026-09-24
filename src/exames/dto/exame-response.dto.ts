import { ApiProperty } from '@nestjs/swagger';

export class DocumentoVinculadoResponseDto {
  @ApiProperty({ example: '251', description: 'Código externo, sempre retornado como texto.' })
  CodigoDocumento!: string;

  @ApiProperty({ example: '616', description: 'Código do pedido, sempre retornado como texto.' })
  CodigoPedido!: string;

  @ApiProperty({ example: 'PEDIDO' })
  NomeDocumento!: string;
}

export class ExameResponseDto {
  @ApiProperty({ example: '930', description: 'AccessionNumber, sempre retornado como texto.' })
  AccessionNumber!: string;

  @ApiProperty({ example: 'ALEFHER MONTONI DE ALMEIDA' })
  NomePaciente!: string;

  @ApiProperty({ example: 'CR' })
  Modalidade!: string;

  @ApiProperty({ example: 'NOVO' })
  Status!: string;

  @ApiProperty({ type: [DocumentoVinculadoResponseDto] })
  Documentos!: DocumentoVinculadoResponseDto[];

  @ApiProperty({ example: '2026-09-23T12:00:00.000Z' })
  CreatedAt!: string;

  @ApiProperty({ example: '2026-09-23T12:00:00.000Z' })
  UpdatedAt!: string;
}

export const EXAME_RESPONSE_PENDING_EXAMPLE: ExameResponseDto = {
  AccessionNumber: '930',
  NomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
  Modalidade: 'CR',
  Status: 'NOVO',
  Documentos: [],
  CreatedAt: '2026-09-24T12:00:00.000Z',
  UpdatedAt: '2026-09-24T12:00:00.000Z',
};

export const EXAME_RESPONSE_INTEGRATED_EXAMPLE: ExameResponseDto = {
  ...EXAME_RESPONSE_PENDING_EXAMPLE,
  Documentos: [
    {
      CodigoDocumento: '251',
      CodigoPedido: '616',
      NomeDocumento: 'PEDIDO',
    },
  ],
  UpdatedAt: '2026-09-24T12:01:00.000Z',
};
