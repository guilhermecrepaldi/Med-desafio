import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import {
  normalizeExternalIdentifier,
  trimString,
} from '../../common/validation/value-transformers';

export class CreateDocumentoDto {
  @ApiProperty({ example: 251 })
  @Transform(normalizeExternalIdentifier)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  CodigoDocumento!: string;

  @ApiProperty({ example: 616, description: 'Código do pedido ao qual o documento se refere.' })
  @Transform(normalizeExternalIdentifier)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  CodigoPedido!: string;

  @ApiProperty({ example: 'PEDIDO' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  NomeDocumento!: string;

  @ApiProperty({
    example: 'base64',
    description: 'Conteúdo textual do documento. Não é registrado em logs.',
  })
  @IsString()
  @IsNotEmpty()
  Documento!: string;
}
