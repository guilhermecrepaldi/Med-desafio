import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DocumentoEntity } from './documento.entity';
import { ItemPedidoEntity } from './item-pedido.entity';

@Entity({ name: 'pedidos' })
export class PedidoEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'codigo_pedido', type: 'varchar', length: 100 })
  codigoPedido!: string;

  @Column({ name: 'nome_paciente', type: 'varchar', length: 255 })
  nomePaciente!: string;

  @Column({ name: 'data_nascimento', type: 'date' })
  dataNascimento!: string;

  @Column({ type: 'varchar', length: 20 })
  sexo!: string;

  @Column({ name: 'cod_unidade', type: 'varchar', length: 100 })
  codUnidade!: string;

  @Column({ type: 'boolean', default: false })
  integrado!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ItemPedidoEntity, (item) => item.pedido)
  itens!: ItemPedidoEntity[];

  @OneToMany(() => DocumentoEntity, (documento) => documento.pedido)
  documentos!: DocumentoEntity[];
}
