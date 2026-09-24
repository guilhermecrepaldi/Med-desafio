import { Body, Controller, Get, HttpStatus, Param, Post, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { errorResponseExample, REQUEST_ID_RESPONSE_HEADERS } from '../common';
import { ErrorResponseDto } from '../common/dto';
import {
  CreateExameDto,
  EXAME_RESPONSE_INTEGRATED_EXAMPLE,
  EXAME_RESPONSE_PENDING_EXAMPLE,
  ExameResponseDto,
} from './dto';
import { ExamesService } from './exames.service';

@ApiTags('Exames')
@Controller('exames')
export class ExamesController {
  constructor(private readonly examesService: ExamesService) {}

  @Post()
  @ApiOperation({ summary: 'Recebe um exame e reconcilia todos os pedidos compatíveis.' })
  @ApiBody({
    type: CreateExameDto,
    examples: {
      exame: {
        value: {
          AccessionNumber: '930',
          NomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
          Modalidade: 'CR',
          Status: 'NOVO',
        },
      },
    },
  })
  @ApiCreatedResponse({
    type: ExameResponseDto,
    description: 'Exame criado.',
    example: EXAME_RESPONSE_PENDING_EXAMPLE,
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiOkResponse({
    type: ExameResponseDto,
    description: 'Reenvio idempotente de exame existente.',
    example: EXAME_RESPONSE_INTEGRATED_EXAMPLE,
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(400, '/exames', ['AccessionNumber should not be empty']),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(
      409,
      '/exames',
      'Exame já existe com dados divergentes para o mesmo AccessionNumber.',
    ),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(500, '/exames', 'Erro interno do servidor.'),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  async create(
    @Body() dto: CreateExameDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ExameResponseDto> {
    const result = await this.examesService.receive(dto);
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);

    return result.exame;
  }

  @Get(':accessionNumber')
  @ApiOperation({ summary: 'Consulta um exame pelo AccessionNumber.' })
  @ApiParam({ name: 'accessionNumber', example: '930' })
  @ApiOkResponse({
    type: ExameResponseDto,
    example: EXAME_RESPONSE_INTEGRATED_EXAMPLE,
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(
      400,
      '/exames/',
      'accessionNumber deve ser um identificador não vazio de até 100 caracteres.',
    ),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(404, '/exames/930', 'Exame não encontrado.'),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(500, '/exames/930', 'Erro interno do servidor.'),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  async findOne(@Param('accessionNumber') accessionNumber: string): Promise<ExameResponseDto> {
    return this.examesService.findByAccession(accessionNumber);
  }
}
