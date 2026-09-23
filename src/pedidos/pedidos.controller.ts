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

import { ErrorResponseDto } from '../common/dto';
import { CreatePedidoDto, PedidoResponseDto } from './dto';
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
  @ApiCreatedResponse({ type: PedidoResponseDto, description: 'Pedido criado.' })
  @ApiOkResponse({
    type: PedidoResponseDto,
    description: 'Reenvio idempotente de pedido existente.',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiInternalServerErrorResponse({ type: ErrorResponseDto })
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
  @ApiOkResponse({ type: PedidoResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiInternalServerErrorResponse({ type: ErrorResponseDto })
  async findOne(@Param('codigoPedido') codigoPedido: string): Promise<PedidoResponseDto> {
    return this.pedidosService.findByCodigo(codigoPedido);
  }
}
