import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';

import { StructuredLogger } from '../common';
import { normalizeRouteIdentifier } from '../common/validation/route-identifier';
import { DocumentoEntity, PedidoEntity } from '../database/entities';
import { ReconciliationService, type ReconciliationSummary } from '../integration';
import { type CreateDocumentoDto, type DocumentoResponseDto } from './dto';

export interface ReceiveDocumentoResult {
  documento: DocumentoResponseDto;
}

@Injectable()
export class DocumentosService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly reconciliationService: ReconciliationService,
    private readonly logger: StructuredLogger,
  ) {}

  async receive(dto: CreateDocumentoDto): Promise<ReceiveDocumentoResult> {
    this.logger.info('documento.recebido', {
      codigoDocumento: dto.CodigoDocumento,
      codigoPedido: dto.CodigoPedido,
    });

    const result = await this.dataSource.transaction(async (manager) => {
      const documentoRepository = manager.getRepository(DocumentoEntity);
      const existente = await documentoRepository.findOneBy({
        codigoDocumento: dto.CodigoDocumento,
        codigoPedidoReferencia: dto.CodigoPedido,
      });

      if (existente !== null) {
        throw new ConflictException(
          'Já existe documento com CodigoDocumento e CodigoPedido informados.',
        );
      }

      const pedido = await manager.getRepository(PedidoEntity).findOneBy({
        codigoPedido: dto.CodigoPedido,
      });
      const documento = await documentoRepository.save(
        documentoRepository.create({
          codigoDocumento: dto.CodigoDocumento,
          codigoPedidoReferencia: dto.CodigoPedido,
          nomeDocumento: dto.NomeDocumento,
          documento: dto.Documento,
          integrado: false,
          pedido,
        }),
      );
      const summary = await this.reconciliationService.reconcileDocumento(manager, documento.id);
      const documentoReconciliado = await this.findDocumentoById(manager, documento.id);

      return { documento: documentoReconciliado, summary };
    });

    this.logger.info('documento.criado', {
      codigoDocumento: result.documento.codigoDocumento,
      codigoPedido: result.documento.codigoPedidoReferencia,
      ...this.integrationLogMetadata(result.summary),
    });

    return { documento: this.toResponse(result.documento) };
  }

  async findByCodigoPedido(codigoPedido: string): Promise<DocumentoResponseDto[]> {
    const codigoNormalizado = normalizeRouteIdentifier(codigoPedido, 'codigoPedido');
    const documentos = await this.findDocumentosByCodigoPedido(
      this.dataSource.manager,
      codigoNormalizado,
    );

    if (documentos.length === 0) {
      throw new NotFoundException('Nenhum documento foi encontrado para o pedido informado.');
    }

    return documentos.map((documento) => this.toResponse(documento));
  }

  private async findDocumentoById(
    manager: EntityManager,
    documentoId: string,
  ): Promise<DocumentoEntity> {
    const documento = await manager
      .getRepository(DocumentoEntity)
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.documentosExames', 'documentoExame')
      .leftJoinAndSelect('documentoExame.exame', 'exame')
      .where('documento.id = :documentoId', { documentoId })
      .getOne();

    if (documento === null) {
      throw new NotFoundException('Documento não encontrado.');
    }

    return documento;
  }

  private async findDocumentosByCodigoPedido(
    manager: EntityManager,
    codigoPedido: string,
  ): Promise<DocumentoEntity[]> {
    return manager
      .getRepository(DocumentoEntity)
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.documentosExames', 'documentoExame')
      .leftJoinAndSelect('documentoExame.exame', 'exame')
      .where('documento.codigo_pedido_referencia = :codigoPedido', { codigoPedido })
      .orderBy('documento.created_at', 'ASC')
      .getMany();
  }

  private toResponse(documento: DocumentoEntity): DocumentoResponseDto {
    return {
      CodigoDocumento: documento.codigoDocumento,
      CodigoPedido: documento.codigoPedidoReferencia,
      NomeDocumento: documento.nomeDocumento,
      Documento: documento.documento,
      Integrado: documento.integrado,
      Exames: documento.documentosExames.map((documentoExame) => ({
        AccessionNumber: documentoExame.exame.accessionNumber,
        Modalidade: documentoExame.exame.modalidade,
        Status: documentoExame.exame.status,
      })),
      CreatedAt: documento.createdAt.toISOString(),
      UpdatedAt: documento.updatedAt.toISOString(),
    };
  }

  private integrationLogMetadata(summary: ReconciliationSummary): Record<string, number> {
    return {
      documentosResolvidos: summary.documentosResolvidos,
      pedidosIntegrados: summary.pedidosIntegrados,
      vinculosCandidatos: summary.vinculosCandidatos,
    };
  }
}
