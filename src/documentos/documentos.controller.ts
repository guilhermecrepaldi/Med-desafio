import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

import { errorResponseExample, REQUEST_ID_RESPONSE_HEADERS } from '../common';
import { ErrorResponseDto } from '../common/dto';
import {
  CreateDocumentoDto,
  DOCUMENTO_RESPONSE_INTEGRATED_EXAMPLE,
  DOCUMENTO_RESPONSE_PENDING_EXAMPLE,
  DocumentoResponseDto,
} from './dto';
import { DocumentosService } from './documentos.service';

@ApiTags('Documentos')
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Post()
  @ApiOperation({ summary: 'Recebe um documento, inclusive antes de seu pedido existir.' })
  @ApiBody({
    type: CreateDocumentoDto,
    examples: {
      documento: {
        value: {
          CodigoDocumento: 251,
          CodigoPedido: 616,
          NomeDocumento: 'PEDIDO',
          Documento: 'base64',
        },
      },
    },
  })
  @ApiCreatedResponse({
    type: DocumentoResponseDto,
    description: 'Documento criado.',
    example: DOCUMENTO_RESPONSE_PENDING_EXAMPLE,
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(400, '/documentos', ['Documento should not be empty']),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Documento duplicado.',
    example: errorResponseExample(
      409,
      '/documentos',
      'Já existe documento com CodigoDocumento e CodigoPedido informados.',
    ),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(500, '/documentos', 'Erro interno do servidor.'),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  async create(@Body() dto: CreateDocumentoDto): Promise<DocumentoResponseDto> {
    const result = await this.documentosService.receive(dto);

    return result.documento;
  }

  @Get(':codigoPedido')
  @ApiOperation({ summary: 'Lista os documentos de um pedido pelo CódigoPedido.' })
  @ApiParam({ name: 'codigoPedido', example: '616' })
  @ApiOkResponse({
    type: DocumentoResponseDto,
    isArray: true,
    example: [DOCUMENTO_RESPONSE_INTEGRATED_EXAMPLE],
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(
      400,
      '/documentos/',
      'codigoPedido deve ser um identificador não vazio de até 100 caracteres.',
    ),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(
      404,
      '/documentos/616',
      'Nenhum documento foi encontrado para o pedido informado.',
    ),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    example: errorResponseExample(500, '/documentos/616', 'Erro interno do servidor.'),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  async findByCodigoPedido(
    @Param('codigoPedido') codigoPedido: string,
  ): Promise<DocumentoResponseDto[]> {
    return this.documentosService.findByCodigoPedido(codigoPedido);
  }
}
