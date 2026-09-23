import { ApiProperty } from '@nestjs/swagger';

export class DocumentoVinculadoResponseDto {
  @ApiProperty({ example: '251' })
  CodigoDocumento!: string;

  @ApiProperty({ example: '616' })
  CodigoPedido!: string;

  @ApiProperty({ example: 'PEDIDO' })
  NomeDocumento!: string;
}

export class ExameResponseDto {
  @ApiProperty({ example: '930' })
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
