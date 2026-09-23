import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PedidoEntity } from './pedido.entity';

@Entity({ name: 'itens_pedido' })
export class ItemPedidoEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'codigo_item_pedido', type: 'varchar', length: 100 })
  codigoItemPedido!: string;

  @Column({ name: 'accession_number', type: 'varchar', length: 100 })
  accessionNumber!: string;

  @Column({ type: 'varchar', length: 50 })
  modalidade!: string;

  @Column({ name: 'nome_procedimento', type: 'varchar', length: 255 })
  nomeProcedimento!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => PedidoEntity, (pedido) => pedido.itens, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'pedido_id' })
  pedido!: PedidoEntity;
}
