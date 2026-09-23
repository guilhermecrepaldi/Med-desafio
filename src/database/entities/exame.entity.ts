import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DocumentoExameEntity } from './documento-exame.entity';

@Entity({ name: 'exames' })
export class ExameEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'accession_number', type: 'varchar', length: 100 })
  accessionNumber!: string;

  @Column({ name: 'nome_paciente', type: 'varchar', length: 255 })
  nomePaciente!: string;

  @Column({ type: 'varchar', length: 50 })
  modalidade!: string;

  @Column({ type: 'varchar', length: 50 })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => DocumentoExameEntity, (documentoExame) => documentoExame.exame)
  documentosExames!: DocumentoExameEntity[];
}
