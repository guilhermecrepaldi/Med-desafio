import { Body, Controller, Get, HttpStatus, Param, Post, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { ErrorResponseDto } from '../common/dto';
import { CreateExameDto, ExameResponseDto } from './dto';
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
  @ApiCreatedResponse({ type: ExameResponseDto, description: 'Exame criado.' })
  @ApiOkResponse({ type: ExameResponseDto, description: 'Reenvio idempotente de exame existente.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
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
  @ApiOkResponse({ type: ExameResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async findOne(@Param('accessionNumber') accessionNumber: string): Promise<ExameResponseDto> {
    return this.examesService.findByAccession(accessionNumber);
  }
}
