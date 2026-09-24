import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';

import { StructuredLogger } from '../common';
import { normalizeRouteIdentifier } from '../common/validation/route-identifier';
import { ExameEntity } from '../database/entities';
import { ReconciliationService, type ReconciliationSummary } from '../integration';
import { type CreateExameDto, type ExameResponseDto } from './dto';

export interface ReceiveExameResult {
  created: boolean;
  exame: ExameResponseDto;
}

@Injectable()
export class ExamesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly reconciliationService: ReconciliationService,
    private readonly logger: StructuredLogger,
  ) {}

  async receive(dto: CreateExameDto): Promise<ReceiveExameResult> {
    this.logger.info('exame.recebido', { accessionNumber: dto.AccessionNumber });

    const result = await this.dataSource.transaction(async (manager) => {
      const exameRepository = manager.getRepository(ExameEntity);
      let exame = await exameRepository.findOneBy({ accessionNumber: dto.AccessionNumber });
      let created = false;

      if (exame === null) {
        exame = await exameRepository.save(
          exameRepository.create({
            accessionNumber: dto.AccessionNumber,
            nomePaciente: dto.NomePaciente,
            modalidade: dto.Modalidade,
            status: dto.Status,
          }),
        );
        created = true;
      } else {
        this.ensureCompatibleReplay(exame, dto);
      }

      const summary = await this.reconciliationService.reconcileExame(
        manager,
        exame.accessionNumber,
      );
      const exameReconciliado = await this.findExameByAccession(manager, exame.accessionNumber);

      return { created, exame: exameReconciliado, summary };
    });

    this.logger.info(result.created ? 'exame.criado' : 'exame.reutilizado', {
      accessionNumber: result.exame.accessionNumber,
      ...this.integrationLogMetadata(result.summary),
    });

    return {
      created: result.created,
      exame: this.toResponse(result.exame),
    };
  }

  async findByAccession(accessionNumber: string): Promise<ExameResponseDto> {
    const accessionNormalizado = normalizeRouteIdentifier(accessionNumber, 'accessionNumber');
    const exame = await this.findExameByAccession(this.dataSource.manager, accessionNormalizado);

    return this.toResponse(exame);
  }

  private ensureCompatibleReplay(exame: ExameEntity, dto: CreateExameDto): void {
    const compatible =
      exame.nomePaciente === dto.NomePaciente &&
      exame.modalidade === dto.Modalidade &&
      exame.status === dto.Status;

    if (!compatible) {
      throw new ConflictException(
        'Exame já existe com dados divergentes para o mesmo AccessionNumber.',
      );
    }
  }

  private async findExameByAccession(
    manager: EntityManager,
    accessionNumber: string,
  ): Promise<ExameEntity> {
    const exame = await manager
      .getRepository(ExameEntity)
      .createQueryBuilder('exame')
      .leftJoinAndSelect('exame.documentosExames', 'documentoExame')
      .leftJoinAndSelect('documentoExame.documento', 'documento')
      .where('exame.accession_number = :accessionNumber', { accessionNumber })
      .getOne();

    if (exame === null) {
      throw new NotFoundException('Exame não encontrado.');
    }

    return exame;
  }

  private toResponse(exame: ExameEntity): ExameResponseDto {
    return {
      AccessionNumber: exame.accessionNumber,
      NomePaciente: exame.nomePaciente,
      Modalidade: exame.modalidade,
      Status: exame.status,
      Documentos: exame.documentosExames.map((documentoExame) => ({
        CodigoDocumento: documentoExame.documento.codigoDocumento,
        CodigoPedido: documentoExame.documento.codigoPedidoReferencia,
        NomeDocumento: documentoExame.documento.nomeDocumento,
      })),
      CreatedAt: exame.createdAt.toISOString(),
      UpdatedAt: exame.updatedAt.toISOString(),
    };
  }

  private integrationLogMetadata(summary: ReconciliationSummary): Record<string, number> {
    return {
      documentosResolvidos: summary.documentosResolvidos,
      pedidosIntegrados: summary.pedidosIntegrados,
      vinculosCandidatos: summary.vinculosCandidatos,
      vinculosCriados: summary.vinculosCriados,
    };
  }
}
