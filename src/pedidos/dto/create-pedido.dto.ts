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
  @ApiProperty({ example: 616, description: 'Código externo único do pedido.' })
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

  @ApiProperty({ example: '19970601', description: 'Data no formato YYYYMMDD.' })
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

  @ApiProperty({ example: 104 })
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
