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
  @ApiProperty({ example: '251' })
  CodigoDocumento!: string;

  @ApiProperty({ example: '616' })
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
