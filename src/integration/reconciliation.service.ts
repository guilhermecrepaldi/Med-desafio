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
}

const EMPTY_SUMMARY: ReconciliationSummary = {
  documentosResolvidos: 0,
  pedidosIntegrados: 0,
  pedidosReconciliados: 0,
  vinculosCandidatos: 0,
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

    if (pedidosIntegrados.length > 0) {
      await pedidoRepository
        .createQueryBuilder()
        .update(PedidoEntity)
        .set({ integrado: true })
        .whereInIds(pedidosIntegrados.map((pedido) => pedido.id))
        .execute();
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

    if (vinculos.length > 0) {
      await manager
        .createQueryBuilder()
        .insert()
        .into(DocumentoExameEntity)
        .values(vinculos)
        .orIgnore()
        .execute();

      const documentoIdsIntegrados = [...new Set(vinculos.map((vinculo) => vinculo.documentoId))];
      await documentoRepository
        .createQueryBuilder()
        .update(DocumentoEntity)
        .set({ integrado: true })
        .whereInIds(documentoIdsIntegrados)
        .execute();
    }

    const summary: ReconciliationSummary = {
      pedidosReconciliados: pedidos.length,
      pedidosIntegrados: pedidosIntegrados.length,
      documentosResolvidos: documentosParaResolver.length,
      vinculosCandidatos: vinculos.length,
    };

    this.logger.info('reconciliacao.executada', {
      codigosPedido: codigosUnicos,
      ...summary,
    });

    if (pedidosIntegrados.length > 0) {
      this.logger.info('pedido.integrado', {
        codigosPedido: pedidosIntegrados.map((pedido) => pedido.codigoPedido),
      });
    }

    if (vinculos.length > 0) {
      this.logger.info('documento.vinculado', {
        codigosPedido: codigosUnicos,
        vinculosCandidatos: vinculos.length,
      });
    }

    return summary;
  }
}
