import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

import { ErrorResponseDto } from '../common/dto';
import { CreateDocumentoDto, DocumentoResponseDto } from './dto';
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
  @ApiCreatedResponse({ type: DocumentoResponseDto, description: 'Documento criado.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Documento duplicado.' })
  async create(@Body() dto: CreateDocumentoDto): Promise<DocumentoResponseDto> {
    const result = await this.documentosService.receive(dto);

    return result.documento;
  }

  @Get(':codigoPedido')
  @ApiOperation({ summary: 'Lista os documentos de um pedido pelo CódigoPedido.' })
  @ApiParam({ name: 'codigoPedido', example: '616' })
  @ApiOkResponse({ type: DocumentoResponseDto, isArray: true })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async findByCodigoPedido(
    @Param('codigoPedido') codigoPedido: string,
  ): Promise<DocumentoResponseDto[]> {
    return this.documentosService.findByCodigoPedido(codigoPedido);
  }
}
