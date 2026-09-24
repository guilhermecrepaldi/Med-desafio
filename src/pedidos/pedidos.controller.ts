import { Body, Controller, Get, HttpStatus, Param, Post, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { errorResponseExample, REQUEST_ID_RESPONSE_HEADERS } from '../common';
import { ErrorResponseDto } from '../common/dto';
import {
  CreatePedidoDto,
  PEDIDO_RESPONSE_INTEGRATED_EXAMPLE,
  PEDIDO_RESPONSE_PENDING_EXAMPLE,
  PedidoResponseDto,
} from './dto';
import { PedidosService } from './pedidos.service';

@ApiTags('Pedidos')
@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post()
  @ApiOperation({ summary: 'Recebe um pedido e tenta reconciliá-lo imediatamente.' })
  @ApiBody({
    type: CreatePedidoDto,
    examples: {
      pedido: {
        value: {
          CodigoPedido: 616,
          NomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
          DataNascimento: '19970601',
          Sexo: 'M',
          CodUnidade: 104,
          Exames: [
            {
              CodigoItemPedido: 930,
              AccessionNumber: '930',
              Modalidade: 'CR',
              NomeProcedimento: 'RX ANTEBRACO ESQUERDO',
            },
          ],
        },
      },
    },
  })
  @ApiCreatedResponse({
    type: PedidoResponseDto,
    description: 'Pedido criado.',
    example: PEDIDO_RESPONSE_PENDING_EXAMPLE,
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiOkResponse({
    type: PedidoResponseDto,
    description: 'Reenvio idempotente de pedido existente.',
    example: PEDIDO_RESPONSE_INTEGRATED_EXAMPLE,
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(400, '/pedidos', ['CodigoPedido should not be empty']),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(
      409,
      '/pedidos',
      'Pedido já existe com dados de cabeçalho divergentes; o reenvio não pode alterá-los.',
    ),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(500, '/pedidos', 'Erro interno do servidor.'),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  async create(
    @Body() dto: CreatePedidoDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PedidoResponseDto> {
    const result = await this.pedidosService.receive(dto);
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);

    return result.pedido;
  }

  @Get(':codigoPedido')
  @ApiOperation({ summary: 'Consulta um pedido pelo CódigoPedido.' })
  @ApiParam({ name: 'codigoPedido', example: '616' })
  @ApiOkResponse({
    type: PedidoResponseDto,
    example: PEDIDO_RESPONSE_INTEGRATED_EXAMPLE,
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(
      400,
      '/pedidos/',
      'codigoPedido deve ser um identificador não vazio de até 100 caracteres.',
    ),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(404, '/pedidos/616', 'Pedido não encontrado.'),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(500, '/pedidos/616', 'Erro interno do servidor.'),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  async findOne(@Param('codigoPedido') codigoPedido: string): Promise<PedidoResponseDto> {
    return this.pedidosService.findByCodigo(codigoPedido);
  }
}
