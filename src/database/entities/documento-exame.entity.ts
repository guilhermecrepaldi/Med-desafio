import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { DocumentoEntity } from './documento.entity';
import { ExameEntity } from './exame.entity';

@Entity({ name: 'documentos_exames' })
export class DocumentoExameEntity {
  @PrimaryColumn({ name: 'documento_id', type: 'bigint' })
  documentoId!: string;

  @PrimaryColumn({ name: 'exame_id', type: 'bigint' })
  exameId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => DocumentoEntity, (documento) => documento.documentosExames, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'documento_id' })
  documento!: DocumentoEntity;

  @ManyToOne(() => ExameEntity, (exame) => exame.documentosExames, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'exame_id' })
  exame!: ExameEntity;
}
