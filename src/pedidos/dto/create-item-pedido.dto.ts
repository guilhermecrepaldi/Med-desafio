import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import {
  normalizeExternalIdentifier,
  trimString,
} from '../../common/validation/value-transformers';

export class CreateItemPedidoDto {
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    example: '930',
    description: 'Identificador do item dentro do pedido. Aceita texto ou número e é normalizado.',
  })
  @Transform(normalizeExternalIdentifier)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  CodigoItemPedido!: string;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    example: '930',
    description:
      'Chave de correlação com o exame recebido. Aceita texto ou número e é normalizada.',
  })
  @Transform(normalizeExternalIdentifier)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  AccessionNumber!: string;

  @ApiProperty({ example: 'CR' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  Modalidade!: string;

  @ApiProperty({ example: 'RX ANTEBRACO ESQUERDO' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  NomeProcedimento!: string;
}
