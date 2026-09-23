import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import {
  normalizeExternalIdentifier,
  trimString,
} from '../../common/validation/value-transformers';

export class CreateExameDto {
  @ApiProperty({ example: '930' })
  @Transform(normalizeExternalIdentifier)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  AccessionNumber!: string;

  @ApiProperty({ example: 'ALEFHER MONTONI DE ALMEIDA' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  NomePaciente!: string;

  @ApiProperty({ example: 'CR' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  Modalidade!: string;

  @ApiProperty({ example: 'NOVO' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  Status!: string;
}
