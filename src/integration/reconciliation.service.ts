import { Injectable } from '@nestjs/common';
import { In, type EntityManager } from 'typeorm';

import { StructuredLogger } from '../common';
import {
  DocumentoEntity,
  DocumentoExameEntity,
  ExameEntity,
  PedidoEntity,
} from '../database/entities';

export interface ReconciliationSummary {
  documentosResolvidos: number;
  pedidosIntegrados: number;
  pedidosReconciliados: number;
  vinculosCandidatos: number;
  vinculosCriados: number;
}

const EMPTY_SUMMARY: ReconciliationSummary = {
  documentosResolvidos: 0,
  pedidosIntegrados: 0,
  pedidosReconciliados: 0,
  vinculosCandidatos: 0,
  vinculosCriados: 0,
};

@Injectable()
export class ReconciliationService {
  constructor(private readonly logger: StructuredLogger) {}

  async reconcilePedido(
    manager: EntityManager,
    codigoPedido: string,
  ): Promise<ReconciliationSummary> {
    return this.withFailureLog({ codigoPedido }, () =>
      this.reconcilePedidos(manager, [codigoPedido]),
    );
  }

  async reconcileExame(
    manager: EntityManager,
    accessionNumber: string,
  ): Promise<ReconciliationSummary> {
    return this.withFailureLog({ accessionNumber }, async () => {
      const pedidos = await manager
        .getRepository(PedidoEntity)
        .createQueryBuilder('pedido')
        .innerJoin('pedido.itens', 'item')
        .where('item.accession_number = :accessionNumber', { accessionNumber })
        .getMany();

      return this.reconcilePedidos(
        manager,
        pedidos.map((pedido) => pedido.codigoPedido),
      );
    });
  }

  async reconcileDocumento(
    manager: EntityManager,
    documentoId: string,
  ): Promise<ReconciliationSummary> {
    return this.withFailureLog({ documentoId }, async () => {
      const documento = await manager.getRepository(DocumentoEntity).findOneBy({ id: documentoId });

      if (documento === null) {
        return EMPTY_SUMMARY;
      }

      return this.reconcilePedidos(manager, [documento.codigoPedidoReferencia]);
    });
  }

  private async withFailureLog<T>(
    metadata: Record<string, string>,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.error('reconciliacao.erro', error, metadata);
      throw error;
    }
  }

  private async reconcilePedidos(
    manager: EntityManager,
    codigosPedido: readonly string[],
  ): Promise<ReconciliationSummary> {
    const codigosUnicos = [...new Set(codigosPedido)];

    if (codigosUnicos.length === 0) {
      return EMPTY_SUMMARY;
    }

    const pedidoRepository = manager.getRepository(PedidoEntity);
    const documentoRepository = manager.getRepository(DocumentoEntity);
    const pedidos = await pedidoRepository.find({
      where: { codigoPedido: In(codigosUnicos) },
      relations: { itens: true },
    });

    if (pedidos.length === 0) {
      return EMPTY_SUMMARY;
    }

    const pedidosPorCodigo = new Map(pedidos.map((pedido) => [pedido.codigoPedido, pedido]));
    const documentosPendentes = await documentoRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.pedido', 'pedido')
      .where('documento.codigo_pedido_referencia IN (:...codigosPedido)', {
        codigosPedido: codigosUnicos,
      })
      .andWhere('documento.pedido_id IS NULL')
      .getMany();

    const documentosParaResolver = documentosPendentes.filter((documento) => {
      const pedido = pedidosPorCodigo.get(documento.codigoPedidoReferencia);

      if (pedido === undefined) {
        return false;
      }

      documento.pedido = pedido;
      return true;
    });

    if (documentosParaResolver.length > 0) {
      await documentoRepository.save(documentosParaResolver);
    }

    const pedidoIds = pedidos.map((pedido) => pedido.id);
    const documentos = await documentoRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.pedido', 'pedido')
      .where('documento.pedido_id IN (:...pedidoIds)', { pedidoIds })
      .getMany();

    const accessionNumbers = [
      ...new Set(pedidos.flatMap((pedido) => pedido.itens.map((item) => item.accessionNumber))),
    ];
    const exames =
      accessionNumbers.length === 0
        ? []
        : await manager.getRepository(ExameEntity).findBy({
            accessionNumber: In(accessionNumbers),
          });
    const examesPorAccession = new Map(exames.map((exame) => [exame.accessionNumber, exame]));
    const examesPorPedido = new Map<string, ExameEntity[]>();

    for (const pedido of pedidos) {
      const examesDoPedido = new Map<string, ExameEntity>();

      for (const item of pedido.itens) {
        const exame = examesPorAccession.get(item.accessionNumber);

        if (exame !== undefined) {
          examesDoPedido.set(exame.id, exame);
        }
      }

      examesPorPedido.set(pedido.id, [...examesDoPedido.values()]);
    }

    const pedidosIntegrados = pedidos.filter(
      (pedido) => (examesPorPedido.get(pedido.id)?.length ?? 0) > 0,
    );

    const pedidosParaIntegrar = pedidosIntegrados.filter((pedido) => !pedido.integrado);
    let pedidosIntegradosAgora = 0;

    if (pedidosParaIntegrar.length > 0) {
      const updateResult = await pedidoRepository
        .createQueryBuilder()
        .update(PedidoEntity)
        .set({ integrado: true })
        .whereInIds(pedidosParaIntegrar.map((pedido) => pedido.id))
        .andWhere('integrado = FALSE')
        .execute();
      pedidosIntegradosAgora = updateResult.affected ?? 0;
    }

    const documentosPorPedido = new Map<string, DocumentoEntity[]>();

    for (const documento of documentos) {
      if (documento.pedido !== null) {
        const documentosDoPedido = documentosPorPedido.get(documento.pedido.id) ?? [];
        documentosDoPedido.push(documento);
        documentosPorPedido.set(documento.pedido.id, documentosDoPedido);
      }
    }

    const vinculos = pedidosIntegrados.flatMap((pedido) => {
      const documentosDoPedido = documentosPorPedido.get(pedido.id) ?? [];
      const examesDoPedido = examesPorPedido.get(pedido.id) ?? [];

      return documentosDoPedido.flatMap((documento) =>
        examesDoPedido.map((exame) => ({
          documentoId: documento.id,
          exameId: exame.id,
        })),
      );
    });

    const documentosPorId = new Map(documentos.map((documento) => [documento.id, documento]));
    const examesPorId = new Map(exames.map((exame) => [exame.id, exame]));
    let vinculosCriados: Array<{
      accessionNumber: string;
      codigoDocumento: string;
      codigoPedido: string;
    }> = [];

    if (vinculos.length > 0) {
      const insertResult = await manager
        .createQueryBuilder()
        .insert()
        .into(DocumentoExameEntity)
        .values(vinculos)
        .orIgnore()
        .returning(['documentoId', 'exameId'])
        .execute();

      vinculosCriados = this.toCreatedLinkMetadata(insertResult.raw, documentosPorId, examesPorId);

      const documentoIdsParaIntegrar = [
        ...new Set(
          vinculos
            .map((vinculo) => vinculo.documentoId)
            .filter((documentoId) => documentosPorId.get(documentoId)?.integrado === false),
        ),
      ];

      if (documentoIdsParaIntegrar.length > 0) {
        await documentoRepository
          .createQueryBuilder()
          .update(DocumentoEntity)
          .set({ integrado: true })
          .whereInIds(documentoIdsParaIntegrar)
          .andWhere('integrado = FALSE')
          .execute();
      }
    }

    const summary: ReconciliationSummary = {
      pedidosReconciliados: pedidos.length,
      pedidosIntegrados: pedidosIntegradosAgora,
      documentosResolvidos: documentosParaResolver.length,
      vinculosCandidatos: vinculos.length,
      vinculosCriados: vinculosCriados.length,
    };

    this.logger.info('reconciliacao.executada', {
      codigosPedido: codigosUnicos,
      ...summary,
    });

    if (pedidosIntegradosAgora > 0) {
      this.logger.info('pedido.integrado', {
        codigosPedido: pedidosParaIntegrar.map((pedido) => pedido.codigoPedido),
      });
    }

    if (vinculosCriados.length > 0) {
      this.logger.info('documento.vinculado', {
        quantidade: vinculosCriados.length,
        vinculos: vinculosCriados,
      });
    }

    return summary;
  }

  private toCreatedLinkMetadata(
    rawRows: unknown,
    documentosPorId: ReadonlyMap<string, DocumentoEntity>,
    examesPorId: ReadonlyMap<string, ExameEntity>,
  ): Array<{ accessionNumber: string; codigoDocumento: string; codigoPedido: string }> {
    if (!Array.isArray(rawRows)) {
      return [];
    }

    return rawRows.flatMap((row) => {
      if (!isRecord(row)) {
        return [];
      }

      const documentoId = toStringId(row.documento_id);
      const exameId = toStringId(row.exame_id);

      if (documentoId === undefined || exameId === undefined) {
        return [];
      }

      const documento = documentosPorId.get(documentoId);
      const exame = examesPorId.get(exameId);

      if (documento === undefined || exame === undefined) {
        return [];
      }

      return [
        {
          codigoPedido: documento.codigoPedidoReferencia,
          codigoDocumento: documento.codigoDocumento,
          accessionNumber: exame.accessionNumber,
        },
      ];
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringId(value: unknown): string | undefined {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}
