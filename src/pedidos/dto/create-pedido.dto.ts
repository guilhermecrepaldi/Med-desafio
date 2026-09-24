import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import {
  normalizeExternalIdentifier,
  trimString,
} from '../../common/validation/value-transformers';
import { CreateItemPedidoDto } from './create-item-pedido.dto';

export class CreatePedidoDto {
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    example: '616',
    description: 'Código externo único. Aceita texto ou número e é normalizado.',
  })
  @Transform(normalizeExternalIdentifier)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  CodigoPedido!: string;

  @ApiProperty({ example: 'ALEFHER MONTONI DE ALMEIDA' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  NomePaciente!: string;

  @ApiProperty({
    oneOf: [{ type: 'string', pattern: '^\\d{8}$' }, { type: 'number' }],
    example: '19970601',
    description:
      'Data no formato YYYYMMDD. Aceita texto ou número e é normalizada antes da validação.',
  })
  @Transform(normalizeExternalIdentifier)
  @IsString()
  @Matches(/^\d{8}$/, { message: 'DataNascimento deve usar o formato YYYYMMDD.' })
  DataNascimento!: string;

  @ApiProperty({ example: 'M' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  Sexo!: string;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    example: '104',
    description: 'Código de unidade. Aceita texto ou número e é normalizado.',
  })
  @Transform(normalizeExternalIdentifier)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  CodUnidade!: string;

  @ApiProperty({ type: [CreateItemPedidoDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateItemPedidoDto)
  Exames!: CreateItemPedidoDto[];
}
