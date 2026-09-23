import { ApiProperty } from '@nestjs/swagger';

export class ItemPedidoResponseDto {
  @ApiProperty({ example: '930' })
  CodigoItemPedido!: string;

  @ApiProperty({ example: '930' })
  AccessionNumber!: string;

  @ApiProperty({ example: 'CR' })
  Modalidade!: string;

  @ApiProperty({ example: 'RX ANTEBRACO ESQUERDO' })
  NomeProcedimento!: string;
}

export class PedidoResponseDto {
  @ApiProperty({ example: '616' })
  CodigoPedido!: string;

  @ApiProperty({ example: 'ALEFHER MONTONI DE ALMEIDA' })
  NomePaciente!: string;

  @ApiProperty({ example: '19970601' })
  DataNascimento!: string;

  @ApiProperty({ example: 'M' })
  Sexo!: string;

  @ApiProperty({ example: '104' })
  CodUnidade!: string;

  @ApiProperty({ example: false })
  Integrado!: boolean;

  @ApiProperty({ type: [ItemPedidoResponseDto] })
  Exames!: ItemPedidoResponseDto[];

  @ApiProperty({ example: '2026-09-23T12:00:00.000Z' })
  CreatedAt!: string;

  @ApiProperty({ example: '2026-09-23T12:00:00.000Z' })
  UpdatedAt!: string;
}
