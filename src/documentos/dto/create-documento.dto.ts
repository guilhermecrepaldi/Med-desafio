import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import {
  normalizeExternalIdentifier,
  trimString,
} from '../../common/validation/value-transformers';

export class CreateDocumentoDto {
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    example: '251',
    description: 'Código externo do documento. Aceita texto ou número e é normalizado.',
  })
  @Transform(normalizeExternalIdentifier)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  CodigoDocumento!: string;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'number' }],
    example: '616',
    description:
      'Código do pedido ao qual o documento se refere. Aceita texto ou número e é normalizado.',
  })
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
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  Documento!: string;
}
