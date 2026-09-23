import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DocumentoExameEntity } from './documento-exame.entity';
import { PedidoEntity } from './pedido.entity';

@Entity({ name: 'documentos' })
export class DocumentoEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'codigo_documento', type: 'varchar', length: 100 })
  codigoDocumento!: string;

  @Column({ name: 'codigo_pedido_referencia', type: 'varchar', length: 100 })
  codigoPedidoReferencia!: string;

  @Column({ name: 'nome_documento', type: 'varchar', length: 255 })
  nomeDocumento!: string;

  @Column({ type: 'text' })
  documento!: string;

  @Column({ type: 'boolean', default: false })
  integrado!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => PedidoEntity, (pedido) => pedido.documentos, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn([
    { name: 'pedido_id', referencedColumnName: 'id' },
    { name: 'codigo_pedido_referencia', referencedColumnName: 'codigoPedido' },
  ])
  pedido!: PedidoEntity | null;

  @OneToMany(() => DocumentoExameEntity, (documentoExame) => documentoExame.documento)
  documentosExames!: DocumentoExameEntity[];
}
