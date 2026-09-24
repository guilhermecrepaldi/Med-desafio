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
  @ApiProperty({ example: '616', description: 'Código externo, sempre retornado como texto.' })
  CodigoPedido!: string;

  @ApiProperty({ example: 'ALEFHER MONTONI DE ALMEIDA' })
  NomePaciente!: string;

  @ApiProperty({ example: '19970601' })
  DataNascimento!: string;

  @ApiProperty({ example: 'M' })
  Sexo!: string;

  @ApiProperty({ example: '104', description: 'Código de unidade, sempre retornado como texto.' })
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

export const PEDIDO_RESPONSE_PENDING_EXAMPLE: PedidoResponseDto = {
  CodigoPedido: '616',
  NomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
  DataNascimento: '19970601',
  Sexo: 'M',
  CodUnidade: '104',
  Integrado: false,
  Exames: [
    {
      CodigoItemPedido: '930',
      AccessionNumber: '930',
      Modalidade: 'CR',
      NomeProcedimento: 'RX ANTEBRACO ESQUERDO',
    },
  ],
  CreatedAt: '2026-09-24T12:00:00.000Z',
  UpdatedAt: '2026-09-24T12:00:00.000Z',
};

export const PEDIDO_RESPONSE_INTEGRATED_EXAMPLE: PedidoResponseDto = {
  ...PEDIDO_RESPONSE_PENDING_EXAMPLE,
  Integrado: true,
  UpdatedAt: '2026-09-24T12:01:00.000Z',
};
