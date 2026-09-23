import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';

import { StructuredLogger } from '../common';
import { formatCompactDate, parseCompactDate } from '../common/validation/date-of-birth';
import { normalizeRouteIdentifier } from '../common/validation/route-identifier';
import { ItemPedidoEntity, PedidoEntity } from '../database/entities';
import { ReconciliationService, type ReconciliationSummary } from '../integration';
import { type CreateItemPedidoDto, type CreatePedidoDto, type PedidoResponseDto } from './dto';

export interface ReceivePedidoResult {
  created: boolean;
  pedido: PedidoResponseDto;
}

@Injectable()
export class PedidosService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly reconciliationService: ReconciliationService,
    private readonly logger: StructuredLogger,
  ) {}

  async receive(dto: CreatePedidoDto): Promise<ReceivePedidoResult> {
    this.ensureDistinctItemCodes(dto.Exames);
    const dataNascimento = parseCompactDate(dto.DataNascimento);

    this.logger.info('pedido.recebido', {
      codigoPedido: dto.CodigoPedido,
      quantidadeItens: dto.Exames.length,
    });

    const result = await this.dataSource.transaction(async (manager) => {
      const pedidoRepository = manager.getRepository(PedidoEntity);
      const itemRepository = manager.getRepository(ItemPedidoEntity);
      let pedido = await pedidoRepository.findOne({
        where: { codigoPedido: dto.CodigoPedido },
        relations: { itens: true },
      });
      let created = false;
      let itensAdicionados = 0;

      if (pedido === null) {
        pedido = await pedidoRepository.save(
          pedidoRepository.create({
            codigoPedido: dto.CodigoPedido,
            nomePaciente: dto.NomePaciente,
            dataNascimento,
            sexo: dto.Sexo,
            codUnidade: dto.CodUnidade,
            integrado: false,
          }),
        );
        pedido.itens = [];
        created = true;
      } else {
        this.ensureCompatibleHeader(pedido, dto, dataNascimento);
      }

      const itensNovos = this.collectNewItems(pedido, dto.Exames);

      if (itensNovos.length > 0) {
        await itemRepository.save(
          itensNovos.map((item) =>
            itemRepository.create({
              codigoItemPedido: item.CodigoItemPedido,
              accessionNumber: item.AccessionNumber,
              modalidade: item.Modalidade,
              nomeProcedimento: item.NomeProcedimento,
              pedido,
            }),
          ),
        );
        itensAdicionados = itensNovos.length;
      }

      const summary = await this.reconciliationService.reconcilePedido(
        manager,
        pedido.codigoPedido,
      );
      const pedidoReconciliado = await this.findPedidoByCodigo(manager, pedido.codigoPedido);

      return { created, itensAdicionados, pedido: pedidoReconciliado, summary };
    });

    const pedidoEvent = result.created
      ? 'pedido.criado'
      : result.itensAdicionados > 0
        ? 'pedido.atualizado'
        : 'pedido.reutilizado';
    this.logger.info(pedidoEvent, {
      codigoPedido: result.pedido.codigoPedido,
      itensAdicionados: result.itensAdicionados,
      ...this.integrationLogMetadata(result.summary),
    });

    if (result.itensAdicionados > 0) {
      this.logger.info('item_pedido.adicionado', {
        codigoPedido: result.pedido.codigoPedido,
        quantidade: result.itensAdicionados,
      });
    }

    if (result.summary.pedidosIntegrados > 0) {
      this.logger.info('pedido.integrado', { codigoPedido: result.pedido.codigoPedido });
    }

    return {
      created: result.created,
      pedido: this.toResponse(result.pedido),
    };
  }

  async findByCodigo(codigoPedido: string): Promise<PedidoResponseDto> {
    const codigoNormalizado = normalizeRouteIdentifier(codigoPedido, 'codigoPedido');
    const pedido = await this.findPedidoByCodigo(this.dataSource.manager, codigoNormalizado);

    return this.toResponse(pedido);
  }

  private async findPedidoByCodigo(
    manager: EntityManager,
    codigoPedido: string,
  ): Promise<PedidoEntity> {
    const pedido = await manager.getRepository(PedidoEntity).findOne({
      where: { codigoPedido },
      relations: { itens: true },
    });

    if (pedido === null) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    return pedido;
  }

  private ensureDistinctItemCodes(items: CreateItemPedidoDto[]): void {
    const codigos = items.map((item) => item.CodigoItemPedido);

    if (new Set(codigos).size !== codigos.length) {
      throw new BadRequestException(
        'Exames não pode conter CodigoItemPedido duplicado no mesmo pedido.',
      );
    }
  }

  private ensureCompatibleHeader(
    pedido: PedidoEntity,
    dto: CreatePedidoDto,
    dataNascimento: string,
  ): void {
    const compatible =
      pedido.nomePaciente === dto.NomePaciente &&
      pedido.dataNascimento === dataNascimento &&
      pedido.sexo === dto.Sexo &&
      pedido.codUnidade === dto.CodUnidade;

    if (!compatible) {
      throw new ConflictException(
        'Pedido já existe com dados de cabeçalho divergentes; o reenvio não pode alterá-los.',
      );
    }
  }

  private collectNewItems(
    pedido: PedidoEntity,
    items: CreateItemPedidoDto[],
  ): CreateItemPedidoDto[] {
    const itensPorCodigo = new Map(pedido.itens.map((item) => [item.codigoItemPedido, item]));

    return items.filter((item) => {
      const existente = itensPorCodigo.get(item.CodigoItemPedido);

      if (existente === undefined) {
        return true;
      }

      const compatible =
        existente.accessionNumber === item.AccessionNumber &&
        existente.modalidade === item.Modalidade &&
        existente.nomeProcedimento === item.NomeProcedimento;

      if (!compatible) {
        throw new ConflictException(
          'Item de pedido já existe com dados divergentes; o reenvio não pode alterá-lo.',
        );
      }

      return false;
    });
  }

  private toResponse(pedido: PedidoEntity): PedidoResponseDto {
    return {
      CodigoPedido: pedido.codigoPedido,
      NomePaciente: pedido.nomePaciente,
      DataNascimento: formatCompactDate(pedido.dataNascimento),
      Sexo: pedido.sexo,
      CodUnidade: pedido.codUnidade,
      Integrado: pedido.integrado,
      Exames: pedido.itens.map((item) => ({
        CodigoItemPedido: item.codigoItemPedido,
        AccessionNumber: item.accessionNumber,
        Modalidade: item.modalidade,
        NomeProcedimento: item.nomeProcedimento,
      })),
      CreatedAt: pedido.createdAt.toISOString(),
      UpdatedAt: pedido.updatedAt.toISOString(),
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
